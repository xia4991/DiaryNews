"""Shared parsing helpers used by all per-source adapters."""

from datetime import datetime, timezone

from rapidfuzz import fuzz

from backend.sources import CATEGORIES, SOURCE_PRIORITY


def classify(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    for category, keywords in CATEGORIES:
        for kw in keywords:
            if kw in text:
                return category
    return "Geral"


def parse_date(entry) -> str:
    if entry.get("published_parsed"):
        dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
        return dt.isoformat()
    if entry.get("updated_parsed"):
        dt = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
        return dt.isoformat()
    return datetime.now(timezone.utc).isoformat()


def extract_image_default(entry) -> str:
    """Default image extraction: try media_thumbnail, media_content, enclosures."""
    media_thumb = entry.get("media_thumbnail") or []
    if media_thumb and isinstance(media_thumb, list):
        url = media_thumb[0].get("url", "")
        if url:
            return url

    media_content = entry.get("media_content") or []
    if media_content and isinstance(media_content, list):
        for m in media_content:
            url = m.get("url", "")
            if url:
                return url

    enclosures = entry.get("enclosures") or entry.get("links") or []
    for enc in enclosures:
        if isinstance(enc, dict):
            etype = enc.get("type", "")
            if etype.startswith("image/"):
                url = enc.get("href") or enc.get("url", "")
                if url:
                    return url

    return ""


def extract_rss_category(entry) -> str:
    tags = entry.get("tags") or []
    if tags and isinstance(tags, list):
        term = tags[0].get("term", "") if isinstance(tags[0], dict) else ""
        if term:
            return term
    return entry.get("category", "") or ""


def deduplicate(articles: list) -> list:
    """Remove near-duplicate articles, keeping the highest-priority source.

    Operates on dicts with at least: source, published, title.
    """
    articles = sorted(articles, key=lambda a: SOURCE_PRIORITY.get(a.get("source", ""), 99))
    accepted = []
    for article in articles:
        pub_date = (article.get("published") or "")[:10]
        title_lower = (article.get("title") or "").lower()
        is_dup = any(
            (kept.get("published") or "")[:10] == pub_date
            and fuzz.token_sort_ratio(title_lower, (kept.get("title") or "").lower()) > 70
            for kept in accepted
        )
        if not is_dup:
            accepted.append(article)
    return accepted
