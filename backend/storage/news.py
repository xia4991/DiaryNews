from typing import Optional

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
            """INSERT INTO articles
               (link, title, summary, source, category, published, scraped_content, ai_summary,
                title_zh, content_zh, tags_zh)
               VALUES (:link,:title,:summary,:source,:category,:published,:scraped_content,:ai_summary,
                :title_zh,:content_zh,:tags_zh)
               ON CONFLICT(link) DO UPDATE SET
                 title = excluded.title,
                 summary = excluded.summary,
                 source = excluded.source,
                 category = excluded.category,
                 published = excluded.published,
                 scraped_content = excluded.scraped_content,
                 ai_summary = excluded.ai_summary,
                 title_zh = excluded.title_zh,
                 content_zh = excluded.content_zh,
                 tags_zh = excluded.tags_zh""",
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
                    "title_zh":        a.get("title_zh", ""),
                    "content_zh":      a.get("content_zh", ""),
                    "tags_zh":         a.get("tags_zh", ""),
                }
                for a in articles
            ],
        )


def increment_article_view(link: str) -> Optional[dict]:
    _ensure_db()
    with get_db() as conn:
        conn.execute(
            """UPDATE articles
               SET view_count = COALESCE(view_count, 0) + 1
               WHERE link = ?""",
            (link,),
        )
        row = conn.execute(
            "SELECT link, view_count FROM articles WHERE link = ?",
            (link,),
        ).fetchone()
    return dict(row) if row else None


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
