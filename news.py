import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

import feedparser
import requests as _requests

from config import CATEGORIES, MAX_ARTICLES, MINIMAX_API_URL, MINIMAX_MODEL, RSS_SOURCES
from utils import strip_html

log = logging.getLogger("diarynews.news")


def classify(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    for category, keywords in CATEGORIES:
        for kw in keywords:
            if kw in text:
                return category
    return "Geral"


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


def summarize_with_llm(title: str, content: str, rss_summary: str) -> str:
    api_key = os.environ.get("MINIMAX_API_KEY")
    if not api_key:
        return rss_summary
    body = content[:3000] if content else rss_summary
    prompt = (
        f"Título: {title}\n\nConteúdo:\n{body}\n\n"
        "Escreve um resumo claro e objetivo em português com 2 a 3 frases. "
        "Vai direto aos factos, sem introduções como 'Este artigo fala de'."
    )
    try:
        resp = _requests.post(
            MINIMAX_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": MINIMAX_MODEL, "max_tokens": 180, "messages": [{"role": "user", "content": prompt}]},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        log.warning("summarize_with_llm failed for '%s': %s", title, exc)
        return rss_summary


def _enrich_article(article: dict) -> dict:
    content = scrape_article(article["link"])
    return {
        **article,
        "scraped_content": content,
        "ai_summary": summarize_with_llm(article["title"], content, article["summary"]),
    }


def fetch_all_feeds(existing_urls: set = None) -> list:
    existing_urls = existing_urls or set()
    raw_articles = []
    for source_name, url in RSS_SOURCES.items():
        feed = feedparser.parse(url)
        for entry in feed.entries:
            title = strip_html(entry.get("title", ""))
            summary = strip_html(entry.get("summary", entry.get("description", "")))
            link = entry.get("link", "")
            if not title or not link:
                continue
            raw_articles.append({
                "title":     title,
                "summary":   summary[:500],
                "link":      link,
                "source":    source_name,
                "category":  classify(title, summary),
                "published": _parse_date(entry),
            })

    new_articles = [a for a in raw_articles if a["link"] not in existing_urls]

    enriched = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(_enrich_article, a): a for a in new_articles}
        for future in as_completed(futures):
            try:
                enriched.append(future.result())
            except Exception as exc:
                original = futures[future]
                log.warning("_enrich_article failed for '%s': %s", original["link"], exc)
                enriched.append({**original, "scraped_content": "", "ai_summary": original["summary"]})
    return enriched


def merge_articles(existing: list, new_articles: list) -> list:
    seen_urls = {a["link"] for a in existing}
    merged = list(existing)
    for article in new_articles:
        if article["link"] not in seen_urls:
            merged.append(article)
            seen_urls.add(article["link"])
    merged.sort(key=lambda a: a["published"], reverse=True)
    return merged[:MAX_ARTICLES]
