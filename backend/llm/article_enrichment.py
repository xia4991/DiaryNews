"""News article enrichment via LLM.

This module owns the MiniMax call and response contract for article translation,
summary, category, and Chinese-interest tags. It intentionally does not fetch,
crawl, or scrape article pages.
"""

import hashlib
import json
import logging
import re
from datetime import datetime, timezone

from backend.config import MINIMAX_MODEL
from backend.llm.prompts import ARTICLE_ENRICHMENT_PROMPT_VERSION, article_chinese_prompt
from backend.sources import CATEGORIES, CN_TAG_KEYWORDS
from backend.llm.minimax import call_minimax

log = logging.getLogger("diarynews.llm.article_enrichment")

VALID_CATEGORIES = {c for c, _ in CATEGORIES} | {"Geral"}
_ALLOWED_TAGS = set(CN_TAG_KEYWORDS.keys())
_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$", re.MULTILINE)


def enrich_news_article(
    article: dict,
    text_for_llm: str,
    scraped_content: str = "",
) -> dict:
    """Run MiniMax enrichment for an already prepared article body."""
    zh_prompt = article_chinese_prompt(article["title"], text_for_llm)
    zh_raw = call_minimax(
        zh_prompt,
        max_tokens=1024,
        prompt_version=ARTICLE_ENRICHMENT_PROMPT_VERSION,
    )
    zh_fields = _parse_chinese_response(zh_raw)

    llm_category = zh_fields.get("category", "")
    tags_zh = (
        zh_fields["tags_zh"]
        or article.get("tags_zh", "")
        or _classify_cn_tags(article["title"], article.get("summary", ""))
    )

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


def _classify_cn_tags(title: str, summary: str) -> str:
    """Keyword fallback for Chinese-interest tags when LLM returns empty."""
    text = (title + " " + summary).lower()
    matched = [
        tag for tag, keywords in CN_TAG_KEYWORDS.items()
        if any(kw in text for kw in keywords)
    ]
    return ", ".join(matched)


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
        "title_zh": str(data.get("title_zh", "")).strip(),
        "summary_zh": str(data.get("summary_zh", "")).strip(),
        "content_zh": str(data.get("content_zh", "")).strip(),
        "tags_zh": _normalize_tags(data.get("tags_zh", [])),
        "category": str(data.get("category", "")).strip(),
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
        "title_zh": title_zh,
        "summary_zh": "",
        "content_zh": content_zh,
        "tags_zh": _normalize_tags(tags_zh),
        "category": category,
        "relevance_reason": "",
    }


def _parse_chinese_response(text: str) -> dict:
    """Parse MiniMax response, trying JSON first and legacy line prefixes second."""
    try:
        return _parse_chinese_response_json(text)
    except (ValueError, json.JSONDecodeError) as exc:
        log.warning("JSON parse failed, falling back to line-prefix parser: %s", exc)
        return _parse_chinese_response_lines(text)
