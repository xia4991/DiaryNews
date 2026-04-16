import logging
from datetime import datetime, timezone
from typing import Optional

from backend.database import get_db
from backend.storage.base import _ensure_db

log = logging.getLogger("diarynews.storage.users")


def get_or_create_user(google_id: str, email: str, name: str, avatar: str, is_admin: bool) -> dict:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
        if row:
            conn.execute(
                "UPDATE users SET name = ?, avatar = ?, is_admin = ? WHERE google_id = ?",
                (name, avatar, int(is_admin), google_id),
            )
            updated = conn.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
            return dict(updated)
        conn.execute(
            "INSERT INTO users (google_id, email, name, avatar, is_admin, created_at) VALUES (?,?,?,?,?,?)",
            (google_id, email, name, avatar, int(is_admin), datetime.now(timezone.utc).isoformat()),
        )
        new = conn.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
        return dict(new)


def get_user_by_id(user_id: int) -> Optional[dict]:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None
