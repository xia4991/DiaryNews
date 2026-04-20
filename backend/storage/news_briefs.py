import json
from datetime import datetime, timezone
from typing import Optional

from backend.database import get_db
from backend.storage.base import _ensure_db

BRIEF_TYPES = ("china", "portugal")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_json_list(value: str) -> list:
    if not value:
        return []
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def _serialize_brief(row) -> dict:
    item = dict(row)
    item["bullets"] = _parse_json_list(item.pop("bullets_json", "[]"))
    item["article_links"] = _parse_json_list(item.pop("article_links_json", "[]"))
    return item


def list_daily_news_briefs(brief_type: str, limit: int = 7) -> list:
    if brief_type not in BRIEF_TYPES:
        raise ValueError(f"Invalid brief_type: {brief_type!r}")
    _ensure_db()
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT * FROM daily_news_briefs
            WHERE brief_type = ?
            ORDER BY brief_date DESC, updated_at DESC
            LIMIT ?
            """,
            (brief_type, limit),
        ).fetchall()
    return [_serialize_brief(row) for row in rows]


def get_daily_news_brief(brief_type: str, brief_date: str) -> Optional[dict]:
    if brief_type not in BRIEF_TYPES:
        raise ValueError(f"Invalid brief_type: {brief_type!r}")
    _ensure_db()
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT * FROM daily_news_briefs
            WHERE brief_type = ? AND brief_date = ?
            """,
            (brief_type, brief_date),
        ).fetchone()
    return _serialize_brief(row) if row else None


def upsert_daily_news_brief(
    brief_type: str,
    brief_date: str,
    title: str,
    summary_zh: str,
    bullets: list,
    article_links: list,
) -> dict:
    if brief_type not in BRIEF_TYPES:
        raise ValueError(f"Invalid brief_type: {brief_type!r}")
    _ensure_db()
    now = _now_iso()
    bullets_json = json.dumps(bullets or [], ensure_ascii=False)
    article_links_json = json.dumps(article_links or [], ensure_ascii=False)
    article_count = len(article_links or [])
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO daily_news_briefs (
                brief_date, brief_type, title, summary_zh, bullets_json,
                article_links_json, article_count, generated_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(brief_type, brief_date) DO UPDATE SET
                title = excluded.title,
                summary_zh = excluded.summary_zh,
                bullets_json = excluded.bullets_json,
                article_links_json = excluded.article_links_json,
                article_count = excluded.article_count,
                generated_at = excluded.generated_at,
                updated_at = excluded.updated_at
            """,
            (
                brief_date,
                brief_type,
                title,
                summary_zh,
                bullets_json,
                article_links_json,
                article_count,
                now,
                now,
            ),
        )
        row = conn.execute(
            """
            SELECT * FROM daily_news_briefs
            WHERE brief_type = ? AND brief_date = ?
            """,
            (brief_type, brief_date),
        ).fetchone()
    return _serialize_brief(row)
