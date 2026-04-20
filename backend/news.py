import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

import feedparser
import requests as _requests

from rapidfuzz import fuzz

from backend.sources import CATEGORIES, CN_TAG_KEYWORDS, RSS_SOURCES, SOURCE_PRIORITY
from backend.llm import call_minimax
from backend.prompts import article_summary_prompt, article_chinese_prompt
from backend.utils import strip_html

log = logging.getLogger("diarynews.news")


def classify(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    for category, keywords in CATEGORIES:
        for kw in keywords:
            if kw in text:
                return category
    return "Geral"


def _classify_cn_tags(title: str, summary: str) -> str:
    """Keyword fallback for Chinese-interest tags when LLM returns empty."""
    text = (title + " " + summary).lower()
    matched = [tag for tag, keywords in CN_TAG_KEYWORDS.items()
               if any(kw in text for kw in keywords)]
    return ", ".join(matched)


def _deduplicate(articles: list) -> list:
    """Remove near-duplicate articles, keeping the highest-priority source."""
    articles.sort(key=lambda a: SOURCE_PRIORITY.get(a["source"], 99))
    accepted = []
    for article in articles:
        pub_date = article["published"][:10]
        is_dup = any(
            kept["published"][:10] == pub_date
            and fuzz.token_sort_ratio(article["title"].lower(), kept["title"].lower()) > 70
            for kept in accepted
        )
        if not is_dup:
            accepted.append(article)
    if len(articles) != len(accepted):
        log.info("Dedup: %d articles → %d (dropped %d duplicates)",
                 len(articles), len(accepted), len(articles) - len(accepted))
    return accepted


def _parse_date(entry) -> str:
    if entry.get("published_parsed"):
        dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
        return dt.isoformat()
    return datetime.now(timezone.utc).isoformat()


def scrape_article(url: str) -> str:
    try:
        import trafilatura
        resp = _requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"})
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

    # Call 1: Portuguese summary
    pt_prompt = article_summary_prompt(article["title"], text_for_llm)
    ai_summary = call_minimax(pt_prompt, max_tokens=512, fallback=article["summary"])

    # Call 2: Chinese title + tags + refined content
    zh_prompt = article_chinese_prompt(article["title"], text_for_llm)
    zh_raw = call_minimax(zh_prompt, max_tokens=1024, fallback="")
    zh_fields = _parse_chinese_response(zh_raw)

    llm_category = zh_fields.get("category", "")
    tags_zh = zh_fields["tags_zh"] or _classify_cn_tags(article["title"], article["summary"])
    return {
        **article,
        "scraped_content": content,
        "ai_summary": ai_summary,
        "category": llm_category if llm_category in VALID_CATEGORIES else article["category"],
        "title_zh": zh_fields["title_zh"],
        "tags_zh": tags_zh,
        "content_zh": zh_fields["content_zh"],
    }


def re_enrich_article(article: dict) -> dict:
    """Retry LLM calls for an article that already has scraped_content stored."""
    text_for_llm = (article.get("scraped_content") or "")[:3000] or article.get("summary", "")

    if not article.get("ai_summary") or article["ai_summary"] == article.get("summary"):
        pt_prompt = article_summary_prompt(article["title"], text_for_llm)
        ai_summary = call_minimax(pt_prompt, max_tokens=512, fallback=article.get("ai_summary", ""))
    else:
        ai_summary = article["ai_summary"]

    zh_prompt = article_chinese_prompt(article["title"], text_for_llm)
    zh_raw = call_minimax(zh_prompt, max_tokens=1024, fallback="")
    zh_fields = _parse_chinese_response(zh_raw)

    llm_category = zh_fields.get("category", "")
    tags_zh = (zh_fields["tags_zh"] or article.get("tags_zh", "")
               or _classify_cn_tags(article["title"], article.get("summary", "")))
    return {
        **article,
        "ai_summary": ai_summary,
        "category": llm_category if llm_category in VALID_CATEGORIES else article.get("category", "Geral"),
        "title_zh": zh_fields["title_zh"] or article.get("title_zh", ""),
        "tags_zh": tags_zh,
        "content_zh": zh_fields["content_zh"] or article.get("content_zh", ""),
    }


def _parse_feed(source_name: str, url: str) -> list:
    """Parse a single RSS feed and return raw article dicts."""
    articles = []
    try:
        feed = feedparser.parse(url)
        for entry in feed.entries:
            title = strip_html(entry.get("title", ""))
            summary = strip_html(entry.get("summary", entry.get("description", "")))
            link = entry.get("link", "")
            if not title or not link:
                continue
            articles.append({
                "title":     title,
                "summary":   summary[:500],
                "link":      link,
                "source":    source_name,
                "category":  classify(title, summary),
                "published": _parse_date(entry),
            })
    except Exception as exc:
        log.warning("Failed to parse feed '%s': %s", source_name, exc)
    return articles


def fetch_all_feeds(existing_urls: set = None) -> list:
    existing_urls = existing_urls or set()

    # Parse all RSS feeds in parallel
    raw_articles = []
    with ThreadPoolExecutor(max_workers=9) as executor:
        futures = {executor.submit(_parse_feed, name, url): name
                   for name, url in RSS_SOURCES.items()}
        for future in as_completed(futures):
            raw_articles.extend(future.result())

    new_articles = [a for a in raw_articles if a["link"] not in existing_urls]
    new_articles = _deduplicate(new_articles)
    if not new_articles:
        return []

    # Enrich new articles (scrape + LLM) with limited concurrency
    enriched = []
    with ThreadPoolExecutor(max_workers=1) as executor:
        futures = {executor.submit(_enrich_article, a): a for a in new_articles}
        for future in as_completed(futures):
            try:
                enriched.append(future.result())
            except Exception as exc:
                original = futures[future]
                log.warning("_enrich_article failed for '%s': %s", original["link"], exc)
                enriched.append({**original, "scraped_content": "", "ai_summary": original["summary"]})
    return enriched


