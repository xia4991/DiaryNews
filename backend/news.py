"""LLM enrichment for news articles.

RSS fetching has moved to `backend.crawler/`. This module is now only the
slow, rate-limited side of the pipeline: scraping article bodies and asking
MiniMax for Chinese translation + tagging.

`classify()` is also re-exported here so legacy callers still work.
"""

import hashlib
import json
import logging
import re
from datetime import datetime, timezone

import requests as _requests

from backend.config import MINIMAX_MODEL
from backend.crawler.parsing import classify, deduplicate, parse_date  # noqa: F401 (legacy import path)
from backend.llm import call_minimax
from backend.prompts import ARTICLE_ENRICHMENT_PROMPT_VERSION, article_chinese_prompt
from backend.sources import CATEGORIES, CN_TAG_KEYWORDS

log = logging.getLogger("diarynews.news")

_ALLOWED_TAGS = set(CN_TAG_KEYWORDS.keys())
_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$", re.MULTILINE)


def _classify_cn_tags(title: str, summary: str) -> str:
    """Keyword fallback for Chinese-interest tags when LLM returns empty."""
    text = (title + " " + summary).lower()
    matched = [tag for tag, keywords in CN_TAG_KEYWORDS.items()
               if any(kw in text for kw in keywords)]
    return ", ".join(matched)


def scrape_article(url: str) -> str:
    try:
        import trafilatura
        resp = _requests.get(
            url,
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"},
        )
        resp.raise_for_status()
        text = trafilatura.extract(resp.text, include_comments=False, include_tables=False)
        return text or ""
    except Exception as exc:
        log.warning("scrape_article failed for %s: %s", url, exc)
        return ""


VALID_CATEGORIES = {c for c, _ in CATEGORIES} | {"Geral"}


def _normalize_tags(value) -> str:
    """Accept list or comma-string; return cleaned comma-separated allowed tags."""
    if isinstance(value, str):
        tokens = [t.strip() for t in value.split(",")]
    elif isinstance(value, list):
        tokens = [str(t).strip() for t in value]
    else:
        tokens = []
    cleaned = [t for t in tokens if t and t in _ALLOWED_TAGS]
    return ", ".join(cleaned)


def _extract_json_blob(text: str) -> str:
    """Pull a JSON object out of an LLM response, tolerating code fences and surrounding chatter."""
    if not text:
        return ""
    s = text.strip()
    m = _FENCE_RE.search(s)
    if m:
        s = m.group(1).strip()
    if s.startswith("{") and s.endswith("}"):
        return s
    start = s.find("{")
    end = s.rfind("}")
    if start != -1 and end > start:
        return s[start:end + 1]
    return ""


def _parse_chinese_response_json(text: str) -> dict:
    """Parse the v2 strict-JSON contract. Raises ValueError on malformed input."""
    blob = _extract_json_blob(text)
    if not blob:
        raise ValueError("no JSON object found in response")
    data = json.loads(blob)
    if not isinstance(data, dict):
        raise ValueError(f"expected JSON object, got {type(data).__name__}")
    return {
        "title_zh":         str(data.get("title_zh", "")).strip(),
        "summary_zh":       str(data.get("summary_zh", "")).strip(),
        "content_zh":       str(data.get("content_zh", "")).strip(),
        "tags_zh":          _normalize_tags(data.get("tags_zh", [])),
        "category":         str(data.get("category", "")).strip(),
        "relevance_reason": str(data.get("relevance_reason", "")).strip(),
    }


def _parse_chinese_response_lines(text: str) -> dict:
    """Legacy line-prefix parser. Kept as fallback during v2 rollout."""
    title_zh = ""
    tags_zh = ""
    content_zh = ""
    category = ""
    for line in text.split("\n"):
        if line.startswith("TITLE_ZH:"):
            title_zh = line[len("TITLE_ZH:"):].strip()
        elif line.startswith("TAGS_ZH:"):
            raw = line[len("TAGS_ZH:"):].strip()
            tags_zh = "" if raw == "无" else raw
        elif line.startswith("CATEGORY:"):
            category = line[len("CATEGORY:"):].strip()
        elif line.startswith("CONTENT_ZH:"):
            idx = text.index("CONTENT_ZH:")
            content_zh = text[idx + len("CONTENT_ZH:"):].strip()
            break
    return {
        "title_zh":         title_zh,
        "summary_zh":       "",
        "content_zh":       content_zh,
        "tags_zh":          _normalize_tags(tags_zh),
        "category":         category,
        "relevance_reason": "",
    }


def _parse_chinese_response(text: str) -> dict:
    """Parse MiniMax response into structured fields. Tries JSON first, falls back
    to the legacy line-prefix format for rollout safety."""
    try:
        return _parse_chinese_response_json(text)
    except (ValueError, json.JSONDecodeError) as exc:
        log.warning("JSON parse failed, falling back to line-prefix parser: %s", exc)
        return _parse_chinese_response_lines(text)


def _enrich_article(article: dict) -> dict:
    content = scrape_article(article["link"])
    text_for_llm = content[:3000] if content else article["summary"]

    zh_prompt = article_chinese_prompt(article["title"], text_for_llm)
    # call_minimax raises MiniMaxError subclasses on failure; the caller in
    # services.py handles them per type. No more silent fallback.
    zh_raw = call_minimax(zh_prompt, max_tokens=1024)
    zh_fields = _parse_chinese_response(zh_raw)

    llm_category = zh_fields.get("category", "")
    tags_zh = zh_fields["tags_zh"] or _classify_cn_tags(article["title"], article["summary"])
    return {
        **article,
        "scraped_content": content,
        "ai_summary": article["summary"],
        "category": llm_category if llm_category in VALID_CATEGORIES else article["category"],
        "title_zh": zh_fields["title_zh"],
        "tags_zh": tags_zh,
        "content_zh": zh_fields["content_zh"],
    }


def ensure_scraped_content(article: dict) -> tuple[str, str]:
    """Return (text_for_llm, scraped_content_to_persist).

    Reuse stored scraped_content if present. Otherwise scrape on demand;
    on scrape failure fall back to RSS summary for the LLM and leave
    scraped_content empty so a future retry may try again.
    """
    stored = article.get("scraped_content") or ""
    if stored:
        return stored[:3000], stored
    fresh = scrape_article(article["link"])
    if fresh:
        return fresh[:3000], fresh
    return article.get("summary", "") or "", ""


def re_enrich_article(article: dict) -> dict:
    """Run LLM enrichment, scraping the body on demand when missing.

    Raises MiniMaxError subclasses on LLM failure; callers in services.py decide
    whether to retry, mark failed, or abort the whole batch.

    On success, populates summary_zh / relevance_reason and the four observability
    columns (enriched_at, enrichment_model, enrichment_prompt_version,
    enrichment_input_hash) so admin tooling and re-enrichment heuristics have
    something to work with.
    """
    text_for_llm, scraped_content = ensure_scraped_content(article)

    zh_prompt = article_chinese_prompt(article["title"], text_for_llm)
    zh_raw = call_minimax(
        zh_prompt,
        max_tokens=1024,
        prompt_version=ARTICLE_ENRICHMENT_PROMPT_VERSION,
    )
    zh_fields = _parse_chinese_response(zh_raw)

    llm_category = zh_fields.get("category", "")
    tags_zh = (zh_fields["tags_zh"] or article.get("tags_zh", "")
               or _classify_cn_tags(article["title"], article.get("summary", "")))

    input_hash = hashlib.sha256(
        f"{article['title']}\n{text_for_llm}".encode("utf-8")
    ).hexdigest()[:16]

    title_zh = zh_fields["title_zh"] or article.get("title_zh", "")
    content_zh = zh_fields["content_zh"] or article.get("content_zh", "")
    enriched_at = (
        datetime.now(timezone.utc).isoformat()
        if title_zh and content_zh else article.get("enriched_at", "")
    )

    return {
        **article,
        "scraped_content": scraped_content or article.get("scraped_content", ""),
        "category": llm_category if llm_category in VALID_CATEGORIES else article.get("category", "Geral"),
        "title_zh": title_zh,
        "summary_zh": zh_fields.get("summary_zh", "") or article.get("summary_zh", ""),
        "tags_zh": tags_zh,
        "content_zh": content_zh,
        "relevance_reason": zh_fields.get("relevance_reason", "") or article.get("relevance_reason", ""),
        "enriched_at": enriched_at,
        "enrichment_model": MINIMAX_MODEL,
        "enrichment_prompt_version": ARTICLE_ENRICHMENT_PROMPT_VERSION,
        "enrichment_input_hash": input_hash,
    }
