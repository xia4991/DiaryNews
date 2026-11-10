"""Shared parsing helpers used by all per-source adapters."""

import re
import unicodedata
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


def _strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)
    )


def normalize_title(title: str, source: str = "") -> str:
    """Normalize a headline for fuzzy comparison.

    Lowercases, strips accents, removes a trailing ' - <source>' style attribution,
    and reduces punctuation to spaces so cross-source variants of the same headline
    align. Shared by deduplicate() and the Track B cross-source grouping pass.
    """
    if not title:
        return ""
    text = _strip_accents(title).lower()
    src = _strip_accents(source).lower().strip()
    if src:
        for sep in (" - ", " | ", " – ", " — ", " :: "):
            suffix = sep + src
            if text.endswith(suffix):
                text = text[: -len(suffix)]
                break
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def deduplicate(articles: list) -> list:
    """Drop near-identical articles from the SAME source within a fetch cycle.

    Matches on same source + same publication day + fuzzy normalized-title similarity.
    Cross-source duplicates are intentionally KEPT so the Track B grouping pass can
    collapse them to one card with an 'N sources' badge — dropping them here would make
    that count impossible. Operates on dicts with at least: source, published, title.
    """
    articles = sorted(articles, key=lambda a: SOURCE_PRIORITY.get(a.get("source", ""), 99))
    accepted = []
    accepted_keys = []  # (pub_date, normalized_title, source)
    for article in articles:
        pub_date = (article.get("published") or "")[:10]
        source = article.get("source") or ""
        norm = normalize_title(article.get("title") or "", source)
        is_dup = any(
            kept_source == source
            and kept_date == pub_date
            and norm
            and fuzz.token_sort_ratio(norm, kept_norm) > 70
            for kept_date, kept_norm, kept_source in accepted_keys
        )
        if not is_dup:
            accepted.append(article)
            accepted_keys.append((pub_date, norm, source))
    return accepted
