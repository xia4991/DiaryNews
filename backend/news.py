import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

import feedparser
import requests as _requests

from backend.config import CATEGORIES, RSS_SOURCES
from backend.llm import call_minimax
from backend.utils import strip_html

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


def _enrich_article(article: dict) -> dict:
    content = scrape_article(article["link"])
    prompt = (
        f"Título: {article['title']}\n\nConteúdo:\n{content[:3000] if content else article['summary']}\n\n"
        "Escreve um resumo claro e objetivo em português com 2 a 3 frases. "
        "Vai direto aos factos, sem introduções como 'Este artigo fala de'."
    )
    return {
        **article,
        "scraped_content": content,
        "ai_summary": call_minimax(prompt, max_tokens=180, fallback=article["summary"]),
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


