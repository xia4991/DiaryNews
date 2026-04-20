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
            current_name = (row["name"] or "").strip()
            next_name = current_name or name
            conn.execute(
                "UPDATE users SET email = ?, name = ?, google_name = ?, avatar = ?, is_admin = ?, updated_at = ? WHERE google_id = ?",
                (email, next_name, name, avatar, int(is_admin), now, google_id),
            )
            updated = conn.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
            return dict(updated)
        conn.execute(
            "INSERT INTO users (google_id, email, name, google_name, avatar, is_admin, created_at, updated_at)"
            " VALUES (?,?,?,?,?,?,?,?)",
            (google_id, email, name, name, avatar, int(is_admin), now, now),
        )
        new = conn.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
        return dict(new)


def get_user_by_id(user_id: int) -> Optional[dict]:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None


def export_user_data(user_id: int) -> Optional[dict]:
    _ensure_db()
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            return None
        u = dict(user)
        data = {"profile": {
            "id": u["id"],
            "email": u["email"],
            "name": u["name"],
            "phone": u.get("phone"),
            "created_at": u["created_at"],
            "updated_at": u.get("updated_at"),
        }}

        rows = conn.execute(
            "SELECT * FROM listings WHERE owner_id = ? ORDER BY created_at DESC", (user_id,)
        ).fetchall()
        listings = []
        for r in rows:
            d = dict(r)
            ext_tables = {
                "job": "listing_jobs",
                "realestate": "listing_realestate",
                "secondhand": "listing_secondhand",
            }
            tbl = ext_tables.get(d["kind"])
            if tbl:
                ext = conn.execute(f"SELECT * FROM {tbl} WHERE listing_id = ?", (d["id"],)).fetchone()
                if ext:
                    d.update(dict(ext))
            imgs = conn.execute(
                "SELECT storage_key, thumb_key, original_filename FROM listing_images WHERE listing_id = ? ORDER BY position",
                (d["id"],)
            ).fetchall()
            d["images"] = [dict(img) for img in imgs]
            d.pop("owner_id", None)
            listings.append(d)
        data["listings"] = listings

        events = conn.execute(
            "SELECT * FROM community_events WHERE owner_id = ? ORDER BY created_at DESC", (user_id,)
        ).fetchall()
        data["community_events"] = [{k: v for k, v in dict(r).items() if k != "owner_id"} for r in events]

        posts = conn.execute(
            "SELECT * FROM community_posts WHERE owner_id = ? ORDER BY created_at DESC", (user_id,)
        ).fetchall()
        data["community_posts"] = [{k: v for k, v in dict(r).items() if k != "owner_id"} for r in posts]

        replies = conn.execute(
            "SELECT * FROM community_post_replies WHERE owner_id = ? ORDER BY created_at DESC", (user_id,)
        ).fetchall()
        data["community_replies"] = [{k: v for k, v in dict(r).items() if k != "owner_id"} for r in replies]

        reports = conn.execute(
            "SELECT * FROM listing_reports WHERE reporter_id = ? ORDER BY created_at DESC", (user_id,)
        ).fetchall()
        data["listing_reports"] = [{k: v for k, v in dict(r).items() if k != "reporter_id"} for r in reports]

        return data


def delete_user(user_id: int) -> bool:
    _ensure_db()
    with get_db() as conn:
        user = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            return False
        conn.execute("DELETE FROM community_post_replies WHERE owner_id = ?", (user_id,))
        conn.execute("DELETE FROM community_posts WHERE owner_id = ?", (user_id,))
        conn.execute("DELETE FROM community_events WHERE owner_id = ?", (user_id,))
        conn.execute("DELETE FROM listing_reports WHERE reporter_id = ?", (user_id,))
        listing_ids = [r[0] for r in conn.execute(
            "SELECT id FROM listings WHERE owner_id = ?", (user_id,)
        ).fetchall()]
        for lid in listing_ids:
            conn.execute("DELETE FROM listing_images WHERE listing_id = ?", (lid,))
            conn.execute("DELETE FROM listing_jobs WHERE listing_id = ?", (lid,))
            conn.execute("DELETE FROM listing_realestate WHERE listing_id = ?", (lid,))
            conn.execute("DELETE FROM listing_secondhand WHERE listing_id = ?", (lid,))
            conn.execute("DELETE FROM listing_reports WHERE listing_id = ?", (lid,))
        conn.execute("DELETE FROM listings WHERE owner_id = ?", (user_id,))
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        log.info("Deleted user %d and all associated data", user_id)
        return True


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
