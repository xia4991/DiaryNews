from backend.config import MAX_ARTICLES
from backend.database import get_db
from backend.storage.base import _ensure_db, _get_meta, _set_meta


def load_news() -> dict:
    _ensure_db()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM articles ORDER BY published DESC LIMIT ?", (MAX_ARTICLES,)
        ).fetchall()
    return {
        "last_updated": _get_meta("news_last_updated"),
        "articles": [dict(r) for r in rows],
    }


def save_news(data: dict) -> None:
    _ensure_db()
    _bulk_upsert_articles(data.get("articles", []))
    last = data.get("last_updated")
    if last:
        _set_meta("news_last_updated", last)
    _trim_articles()


def _bulk_upsert_articles(articles: list) -> None:
    with get_db() as conn:
        conn.executemany(
            """INSERT OR REPLACE INTO articles
               (link, title, summary, source, category, published, scraped_content, ai_summary)
               VALUES (:link,:title,:summary,:source,:category,:published,:scraped_content,:ai_summary)""",
            [
                {
                    "link":            a.get("link", ""),
                    "title":           a.get("title", ""),
                    "summary":         a.get("summary", ""),
                    "source":          a.get("source", ""),
                    "category":        a.get("category", ""),
                    "published":       a.get("published", ""),
                    "scraped_content": a.get("scraped_content", ""),
                    "ai_summary":      a.get("ai_summary", ""),
                }
                for a in articles
            ],
        )


def _trim_articles() -> None:
    with get_db() as conn:
        conn.execute(
            """DELETE FROM articles WHERE link NOT IN (
                SELECT link FROM articles ORDER BY published DESC LIMIT ?
            )""",
            (MAX_ARTICLES,),
        )


def merge_articles(existing: list, new_articles: list) -> list:
    seen = {a["link"] for a in existing}
    merged = list(existing)
    for a in new_articles:
        if a["link"] not in seen:
            merged.append(a)
            seen.add(a["link"])
    merged.sort(key=lambda a: a["published"], reverse=True)
    return merged[:MAX_ARTICLES]
