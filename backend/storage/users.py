import logging
from datetime import datetime, timezone
from typing import Optional

from backend.database import get_db
from backend.storage.base import _ensure_db

log = logging.getLogger("diarynews.storage.users")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_or_create_user(google_id: str, email: str, name: str, avatar: str, is_admin: bool) -> dict:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
        now = _now()
        if row:
            conn.execute(
                "UPDATE users SET name = ?, avatar = ?, is_admin = ?, updated_at = ? WHERE google_id = ?",
                (name, avatar, int(is_admin), now, google_id),
            )
            updated = conn.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
            return dict(updated)
        conn.execute(
            "INSERT INTO users (google_id, email, name, avatar, is_admin, created_at, updated_at)"
            " VALUES (?,?,?,?,?,?,?)",
            (google_id, email, name, avatar, int(is_admin), now, now),
        )
        new = conn.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
        return dict(new)


def get_user_by_id(user_id: int) -> Optional[dict]:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None


def update_user_profile(user_id: int, name: Optional[str] = None, phone: Optional[str] = None) -> Optional[dict]:
    """Patch-update the user's own profile fields. Returns the updated row."""
    _ensure_db()
    fields, values = [], []
    if name is not None:
        fields.append("name = ?")
        values.append(name)
    if phone is not None:
        fields.append("phone = ?")
        values.append(phone)
    if not fields:
        return get_user_by_id(user_id)
    fields.append("updated_at = ?")
    values.append(_now())
    values.append(user_id)
    with get_db() as conn:
        conn.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", values)
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None
