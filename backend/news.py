"""LLM enrichment for news articles.

RSS fetching has moved to `backend.crawler/`. This module is now only the
slow, rate-limited side of the pipeline: scraping article bodies and asking
MiniMax for Chinese translation + tagging.

`classify()` is also re-exported here so legacy callers still work.
"""

import logging

import requests as _requests

from backend.crawler.parsing import classify, deduplicate, parse_date  # noqa: F401 (legacy import path)
from backend.llm import call_minimax
from backend.prompts import article_chinese_prompt
from backend.sources import CATEGORIES, CN_TAG_KEYWORDS

log = logging.getLogger("diarynews.news")


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


def _parse_chinese_response(text: str) -> dict:
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
    return {"title_zh": title_zh, "tags_zh": tags_zh, "content_zh": content_zh, "category": category}


def _enrich_article(article: dict) -> dict:
    content = scrape_article(article["link"])
    text_for_llm = content[:3000] if content else article["summary"]

    zh_prompt = article_chinese_prompt(article["title"], text_for_llm)
    zh_raw = call_minimax(zh_prompt, max_tokens=1024, fallback="")
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


def re_enrich_article(article: dict) -> dict:
    """Retry LLM calls for an article that already has scraped_content stored."""
    text_for_llm = (article.get("scraped_content") or "")[:3000] or article.get("summary", "")

    zh_prompt = article_chinese_prompt(article["title"], text_for_llm)
    zh_raw = call_minimax(zh_prompt, max_tokens=1024, fallback="")
    zh_fields = _parse_chinese_response(zh_raw)

    llm_category = zh_fields.get("category", "")
    tags_zh = (zh_fields["tags_zh"] or article.get("tags_zh", "")
               or _classify_cn_tags(article["title"], article.get("summary", "")))
    return {
        **article,
        "category": llm_category if llm_category in VALID_CATEGORIES else article.get("category", "Geral"),
        "title_zh": zh_fields["title_zh"] or article.get("title_zh", ""),
        "tags_zh": tags_zh,
        "content_zh": zh_fields["content_zh"] or article.get("content_zh", ""),
    }
