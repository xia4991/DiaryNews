from typing import Optional

from backend.config import MAX_ARTICLES, MAX_ENRICHMENT_ATTEMPTS
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


def get_article_stats() -> dict:
    """Aggregate counts for admin dashboards: total + by enrichment_status + per-source."""
    _ensure_db()
    with get_db() as conn:
        total_row = conn.execute("SELECT COUNT(*) AS c FROM articles").fetchone()
        status_rows = conn.execute(
            "SELECT enrichment_status AS s, COUNT(*) AS c FROM articles GROUP BY enrichment_status"
        ).fetchall()
        source_rows = conn.execute(
            """SELECT
                 source,
                 COUNT(*) AS total,
                 SUM(CASE WHEN enrichment_status = 'done'    THEN 1 ELSE 0 END) AS done,
                 SUM(CASE WHEN enrichment_status = 'pending' THEN 1 ELSE 0 END) AS pending,
                 SUM(CASE WHEN enrichment_status = 'failed'  THEN 1 ELSE 0 END) AS failed,
                 SUM(CASE WHEN image_url != ''  THEN 1 ELSE 0 END) AS with_image,
                 SUM(CASE WHEN author    != ''  THEN 1 ELSE 0 END) AS with_author,
                 MAX(fetched_at) AS last_fetched_at
               FROM articles
               WHERE source IS NOT NULL AND source != ''
               GROUP BY source
               ORDER BY source ASC"""
        ).fetchall()

    by_status = {r["s"] or "unknown": r["c"] for r in status_rows}
    return {
        "total": total_row["c"] if total_row else 0,
        "pending": by_status.get("pending", 0),
        "done": by_status.get("done", 0),
        "failed": by_status.get("failed", 0),
        "by_source": [dict(r) for r in source_rows],
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
                title_zh, content_zh, tags_zh,
                author, image_url, language, guid, rss_category, fetched_at,
                enrichment_status, enrichment_attempts, enrichment_error)
               VALUES (:link,:title,:summary,:source,:category,:published,:scraped_content,:ai_summary,
                :title_zh,:content_zh,:tags_zh,
                :author,:image_url,:language,:guid,:rss_category,:fetched_at,
                :enrichment_status,:enrichment_attempts,:enrichment_error)
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
                 tags_zh = excluded.tags_zh,
                 author = excluded.author,
                 image_url = excluded.image_url,
                 language = excluded.language,
                 guid = excluded.guid,
                 rss_category = excluded.rss_category,
                 fetched_at = excluded.fetched_at,
                 enrichment_status = excluded.enrichment_status,
                 enrichment_attempts = excluded.enrichment_attempts,
                 enrichment_error = excluded.enrichment_error""",
            [
                {
                    "link":                a.get("link", ""),
                    "title":               a.get("title", ""),
                    "summary":             a.get("summary", ""),
                    "source":              a.get("source", ""),
                    "category":            a.get("category", ""),
                    "published":           a.get("published", ""),
                    "scraped_content":     a.get("scraped_content", ""),
                    "ai_summary":          a.get("ai_summary", ""),
                    "title_zh":            a.get("title_zh", ""),
                    "content_zh":          a.get("content_zh", ""),
                    "tags_zh":             a.get("tags_zh", ""),
                    "author":              a.get("author", ""),
                    "image_url":           a.get("image_url", ""),
                    "language":            a.get("language", "pt"),
                    "guid":                a.get("guid", ""),
                    "rss_category":        a.get("rss_category", ""),
                    "fetched_at":          a.get("fetched_at", ""),
                    "enrichment_status":   a.get("enrichment_status", "pending"),
                    "enrichment_attempts": a.get("enrichment_attempts", 0),
                    "enrichment_error":    a.get("enrichment_error", ""),
                }
                for a in articles
            ],
        )


def save_raw_articles(articles: list, last_updated: str) -> None:
    """Stage A — persist freshly-crawled raw articles as enrichment_status='pending'.

    Public alias around _bulk_upsert_articles + last_updated meta + trim.
    """
    _ensure_db()
    for a in articles:
        a.setdefault("enrichment_status", "pending")
    _bulk_upsert_articles(articles)
    if last_updated:
        _set_meta("news_last_updated", last_updated)
    _trim_articles()


def list_recent_articles(limit: int = 20, status: Optional[str] = None) -> list:
    """Recent articles for admin inspection. Optional enrichment_status filter."""
    _ensure_db()
    with get_db() as conn:
        sql = (
            "SELECT link, title, source, category, published, fetched_at, "
            "image_url, author, rss_category, enrichment_status, enrichment_attempts, "
            "enrichment_error, title_zh, tags_zh "
            "FROM articles"
        )
        params: list = []
        if status:
            sql += " WHERE enrichment_status = ?"
            params.append(status)
        sql += " ORDER BY fetched_at DESC, published DESC LIMIT ?"
        params.append(limit)
        rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def list_pending_enrichment(limit: int = 20, max_attempts: int = MAX_ENRICHMENT_ATTEMPTS) -> list:
    """Return articles still missing Chinese enrichment that haven't hit the retry ceiling."""
    _ensure_db()
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM articles
               WHERE enrichment_status NOT IN ('done', 'failed')
                 AND COALESCE(enrichment_attempts, 0) < ?
                 AND (title_zh = '' OR title_zh IS NULL
                      OR content_zh = '' OR content_zh IS NULL
                      OR tags_zh IS NULL)
               ORDER BY published DESC
               LIMIT ?""",
            (max_attempts, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def mark_enrichment_status(
    link: str,
    status: str,
    increment_attempts: bool = True,
    error: Optional[str] = None,
) -> None:
    """Update enrichment_status for one article. Bumps enrichment_attempts by default.

    If `error` is not None, also writes it to `enrichment_error` (pass "" to clear).
    """
    _ensure_db()
    sets = ["enrichment_status = ?"]
    params: list = [status]
    if increment_attempts:
        sets.append("enrichment_attempts = COALESCE(enrichment_attempts, 0) + 1")
    if error is not None:
        sets.append("enrichment_error = ?")
        params.append(error)
    params.append(link)
    sql = f"UPDATE articles SET {', '.join(sets)} WHERE link = ?"
    with get_db() as conn:
        conn.execute(sql, params)


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
