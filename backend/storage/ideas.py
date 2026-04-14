from datetime import datetime, timezone

from backend.database import get_db
from backend.storage.base import _ensure_db


def load_ideas() -> list:
    _ensure_db()
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM ideas ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


def save_idea(title: str, category: str, content: str) -> dict:
    _ensure_db()
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO ideas (title, category, content, created_at, updated_at) VALUES (?,?,?,?,?)",
            (title, category, content, now, now),
        )
        row = conn.execute("SELECT * FROM ideas WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)


def update_idea(idea_id: int, title: str, category: str, content: str) -> dict:
    _ensure_db()
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute(
            "UPDATE ideas SET title=?, category=?, content=?, updated_at=? WHERE id=?",
            (title, category, content, now, idea_id),
        )
        row = conn.execute("SELECT * FROM ideas WHERE id = ?", (idea_id,)).fetchone()
    if row is None:
        raise KeyError(idea_id)
    return dict(row)


def delete_idea(idea_id: int) -> None:
    _ensure_db()
    with get_db() as conn:
        conn.execute("DELETE FROM ideas WHERE id = ?", (idea_id,))
