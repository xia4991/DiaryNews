"""Article scraping helpers for news enrichment.

`classify()` is also re-exported here so legacy callers still work.
"""

import logging

import requests as _requests

from backend.crawler.parsing import classify, deduplicate, parse_date  # noqa: F401 (legacy import path)

log = logging.getLogger("diarynews.news")


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
