from datetime import datetime, timezone
from typing import Optional

from backend.database import get_db
from backend.storage.base import _ensure_db


ANNOUNCEMENT_STATUSES = ("active", "hidden", "removed")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_status(status: str) -> None:
    if status not in ANNOUNCEMENT_STATUSES:
        raise ValueError(f"Invalid status: {status!r}. Must be one of {ANNOUNCEMENT_STATUSES}")


def _row_to_announcement(row) -> Optional[dict]:
    if not row:
        return None
    data = dict(row)
    data["is_pinned"] = bool(data.get("is_pinned"))
    data["creator_is_admin"] = bool(data.get("creator_is_admin"))
    return data


def list_announcements(
    status: str = "public",
    limit: int = 10,
    offset: int = 0,
) -> dict:
    _ensure_db()
    clauses = []
    params = []

    if status == "public":
        clauses.append("a.status = 'active'")
    elif status == "all":
        pass
    else:
        _validate_status(status)
        clauses.append("a.status = ?")
        params.append(status)

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    with get_db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) FROM platform_announcements a {where}",
            params,
        ).fetchone()[0]
        rows = conn.execute(
            f"""SELECT a.*, u.name AS creator_name, u.is_admin AS creator_is_admin
                FROM platform_announcements a
                JOIN users u ON u.id = a.created_by
                {where}
                ORDER BY a.is_pinned DESC, a.updated_at DESC, a.created_at DESC
                LIMIT ? OFFSET ?""",
            params + [limit, offset],
        ).fetchall()

    return {
        "items": [_row_to_announcement(row) for row in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def get_announcement(announcement_id: int, include_nonpublic: bool = False) -> Optional[dict]:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute(
            """SELECT a.*, u.name AS creator_name, u.is_admin AS creator_is_admin
               FROM platform_announcements a
               JOIN users u ON u.id = a.created_by
               WHERE a.id = ?""",
            (announcement_id,),
        ).fetchone()

    announcement = _row_to_announcement(row)
    if not announcement:
        return None
    if not include_nonpublic and announcement["status"] != "active":
        return None
    return announcement


def create_announcement(
    created_by: int,
    title: str,
    content: str,
    is_pinned: bool = False,
    status: str = "active",
) -> dict:
    _ensure_db()
    _validate_status(status)
    now = _now()
    with get_db() as conn:
        cur = conn.execute(
            """INSERT INTO platform_announcements
               (title, content, status, is_pinned, created_by, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (title, content, status, int(is_pinned), created_by, now, now),
        )
    return get_announcement(cur.lastrowid, include_nonpublic=True)


def update_announcement(
    announcement_id: int,
    patch: dict,
) -> dict:
    _ensure_db()
    allowed = {"title", "content", "status", "is_pinned"}
    clean = {key: value for key, value in patch.items() if key in allowed}
    if "status" in clean:
        _validate_status(clean["status"])
    if "is_pinned" in clean:
        clean["is_pinned"] = int(bool(clean["is_pinned"]))

    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM platform_announcements WHERE id = ?",
            (announcement_id,),
        ).fetchone()
        if not row:
            raise KeyError(announcement_id)
        if clean:
            clean["updated_at"] = _now()
            set_clause = ", ".join(f"{key} = ?" for key in clean)
            conn.execute(
                f"UPDATE platform_announcements SET {set_clause} WHERE id = ?",
                list(clean.values()) + [announcement_id],
            )
    return get_announcement(announcement_id, include_nonpublic=True)


def delete_announcement(announcement_id: int) -> None:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM platform_announcements WHERE id = ?",
            (announcement_id,),
        ).fetchone()
        if not row:
            raise KeyError(announcement_id)
        conn.execute(
            "UPDATE platform_announcements SET status = 'removed', updated_at = ? WHERE id = ?",
            (_now(), announcement_id),
        )
