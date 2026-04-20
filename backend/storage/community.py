from datetime import datetime, timezone
from typing import Optional

from backend.database import get_db
from backend.storage.base import _ensure_db


EVENT_CATEGORIES = (
    "Meetup",
    "Family",
    "Talk",
    "JobFair",
    "Business",
    "Sports",
    "Hobby",
    "Dining",
    "Other",
)

POST_CATEGORIES = (
    "Life",
    "Visa",
    "Housing",
    "Jobs",
    "SecondHand",
    "Recommendations",
    "MutualHelp",
    "Chat",
)

COMMUNITY_STATUSES = ("active", "hidden", "removed")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_status(status: str) -> None:
    if status not in COMMUNITY_STATUSES:
        raise ValueError(f"Invalid status: {status!r}. Must be one of {COMMUNITY_STATUSES}")


def _validate_event_category(category: str) -> None:
    if category not in EVENT_CATEGORIES:
        raise ValueError(
            f"Invalid event category: {category!r}. Must be one of {EVENT_CATEGORIES}"
        )


def _validate_post_category(category: str) -> None:
    if category not in POST_CATEGORIES:
        raise ValueError(
            f"Invalid post category: {category!r}. Must be one of {POST_CATEGORIES}"
        )


def _event_public_status(status: str) -> bool:
    return status == "active"


def _post_public_status(status: str) -> bool:
    return status == "active"


def _reply_public_status(status: str) -> bool:
    return status == "active"


def _row_to_event(row) -> dict:
    return dict(row) if row else None


def _row_to_post(row) -> dict:
    return dict(row) if row else None


def _row_to_reply(row) -> dict:
    return dict(row) if row else None


def create_event(
    owner_id: int,
    title: str,
    category: str,
    description: str,
    start_at: str,
    end_at: Optional[str] = None,
    city: Optional[str] = None,
    venue: Optional[str] = None,
    is_free: bool = True,
    fee_text: Optional[str] = None,
    contact_phone: Optional[str] = None,
    contact_whatsapp: Optional[str] = None,
    contact_email: Optional[str] = None,
    signup_url: Optional[str] = None,
) -> dict:
    _ensure_db()
    _validate_event_category(category)
    now = _now()
    with get_db() as conn:
        cur = conn.execute(
            """INSERT INTO community_events
               (owner_id, title, category, description, city, venue, start_at, end_at,
                is_free, fee_text, contact_phone, contact_whatsapp, contact_email,
                signup_url, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)""",
            (
                owner_id, title, category, description, city, venue, start_at, end_at,
                int(is_free), fee_text, contact_phone, contact_whatsapp, contact_email,
                signup_url, now, now,
            ),
        )
        row = conn.execute(
            """SELECT e.*, u.name AS owner_name, u.avatar AS owner_avatar, u.is_admin AS owner_is_admin
               FROM community_events e
               JOIN users u ON u.id = e.owner_id
               WHERE e.id = ?""",
            (cur.lastrowid,),
        ).fetchone()
    event = _row_to_event(row)
    if event:
        event["is_free"] = bool(event["is_free"])
    return event


def list_events(filters: Optional[dict] = None, limit: int = 50, offset: int = 0) -> dict:
    _ensure_db()
    filters = filters or {}
    clauses = []
    params = []

    status = filters.get("status", "public")
    if status == "public":
        clauses.append("e.status = 'active'")
    elif status == "all":
        pass
    else:
        _validate_status(status)
        clauses.append("e.status = ?")
        params.append(status)

    if filters.get("owner_id") is not None:
        clauses.append("e.owner_id = ?")
        params.append(filters["owner_id"])

    if filters.get("category"):
        _validate_event_category(filters["category"])
        clauses.append("e.category = ?")
        params.append(filters["category"])

    if filters.get("city"):
        clauses.append("e.city LIKE ?")
        params.append(f"%{filters['city']}%")

    if filters.get("date_from"):
        clauses.append("e.start_at >= ?")
        params.append(filters["date_from"])

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with get_db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) FROM community_events e {where}",
            params,
        ).fetchone()[0]
        rows = conn.execute(
            f"""SELECT e.*, u.name AS owner_name, u.avatar AS owner_avatar, u.is_admin AS owner_is_admin
                FROM community_events e
                JOIN users u ON u.id = e.owner_id
                {where}
                ORDER BY e.start_at ASC, e.created_at DESC
                LIMIT ? OFFSET ?""",
            params + [limit, offset],
        ).fetchall()
    items = []
    for row in rows:
        event = _row_to_event(row)
        event["is_free"] = bool(event["is_free"])
        items.append(event)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def get_event(event_id: int, include_nonpublic: bool = False) -> Optional[dict]:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute(
            """SELECT e.*, u.name AS owner_name, u.avatar AS owner_avatar, u.is_admin AS owner_is_admin
               FROM community_events e
               JOIN users u ON u.id = e.owner_id
               WHERE e.id = ?""",
            (event_id,),
        ).fetchone()
    event = _row_to_event(row)
    if not event:
        return None
    if not include_nonpublic and not _event_public_status(event["status"]):
        return None
    event["is_free"] = bool(event["is_free"])
    return event


def update_event(
    event_id: int,
    owner_id: int,
    patch: dict,
    is_admin: bool = False,
) -> dict:
    _ensure_db()
    allowed = {
        "title", "category", "description", "city", "venue", "start_at", "end_at",
        "is_free", "fee_text", "contact_phone", "contact_whatsapp", "contact_email",
        "signup_url",
    }
    clean = {k: v for k, v in patch.items() if k in allowed}
    if "category" in clean:
        _validate_event_category(clean["category"])
    if "is_free" in clean:
        clean["is_free"] = int(clean["is_free"])

    with get_db() as conn:
        row = conn.execute(
            "SELECT owner_id FROM community_events WHERE id = ?",
            (event_id,),
        ).fetchone()
        if not row:
            raise KeyError(event_id)
        if row["owner_id"] != owner_id and not is_admin:
            raise PermissionError(f"User {owner_id} does not own event {event_id}")
        if clean:
            clean["updated_at"] = _now()
            set_clause = ", ".join(f"{k} = ?" for k in clean)
            conn.execute(
                f"UPDATE community_events SET {set_clause} WHERE id = ?",
                list(clean.values()) + [event_id],
            )
        row = conn.execute(
            """SELECT e.*, u.name AS owner_name, u.avatar AS owner_avatar, u.is_admin AS owner_is_admin
               FROM community_events e
               JOIN users u ON u.id = e.owner_id
               WHERE e.id = ?""",
            (event_id,),
        ).fetchone()
    event = _row_to_event(row)
    event["is_free"] = bool(event["is_free"])
    return event


def delete_event(event_id: int, owner_id: int, is_admin: bool = False) -> None:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute(
            "SELECT owner_id FROM community_events WHERE id = ?",
            (event_id,),
        ).fetchone()
        if not row:
            raise KeyError(event_id)
        if row["owner_id"] != owner_id and not is_admin:
            raise PermissionError(f"User {owner_id} does not own event {event_id}")
        conn.execute(
            "UPDATE community_events SET status = 'removed', updated_at = ? WHERE id = ?",
            (_now(), event_id),
        )


def create_post(
    owner_id: int,
    title: str,
    category: str,
    content: str,
    city: Optional[str] = None,
) -> dict:
    _ensure_db()
    _validate_post_category(category)
    now = _now()
    with get_db() as conn:
        cur = conn.execute(
            """INSERT INTO community_posts
               (owner_id, title, category, content, city, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'active', ?, ?)""",
            (owner_id, title, category, content, city, now, now),
        )
        row = conn.execute(
            """SELECT p.*, u.name AS owner_name, u.avatar AS owner_avatar, u.is_admin AS owner_is_admin, 0 AS reply_count
               FROM community_posts p
               JOIN users u ON u.id = p.owner_id
               WHERE p.id = ?""",
            (cur.lastrowid,),
        ).fetchone()
    return _row_to_post(row)


def list_posts(filters: Optional[dict] = None, limit: int = 50, offset: int = 0) -> dict:
    _ensure_db()
    filters = filters or {}
    clauses = []
    params = []

    status = filters.get("status", "public")
    if status == "public":
        clauses.append("p.status = 'active'")
    elif status == "all":
        pass
    else:
        _validate_status(status)
        clauses.append("p.status = ?")
        params.append(status)

    if filters.get("owner_id") is not None:
        clauses.append("p.owner_id = ?")
        params.append(filters["owner_id"])

    if filters.get("category"):
        _validate_post_category(filters["category"])
        clauses.append("p.category = ?")
        params.append(filters["category"])

    if filters.get("city"):
        clauses.append("p.city LIKE ?")
        params.append(f"%{filters['city']}%")

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with get_db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) FROM community_posts p {where}",
            params,
        ).fetchone()[0]
        rows = conn.execute(
            f"""SELECT p.*, u.name AS owner_name, u.avatar AS owner_avatar, u.is_admin AS owner_is_admin,
                       (SELECT COUNT(*) FROM community_post_replies r
                        WHERE r.post_id = p.id AND r.status = 'active') AS reply_count
                FROM community_posts p
                JOIN users u ON u.id = p.owner_id
                {where}
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?""",
            params + [limit, offset],
        ).fetchall()
    return {
        "items": [_row_to_post(row) for row in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def get_post(post_id: int, include_nonpublic: bool = False) -> Optional[dict]:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute(
            """SELECT p.*, u.name AS owner_name, u.avatar AS owner_avatar, u.is_admin AS owner_is_admin,
                      (SELECT COUNT(*) FROM community_post_replies r
                       WHERE r.post_id = p.id AND r.status = 'active') AS reply_count
               FROM community_posts p
               JOIN users u ON u.id = p.owner_id
               WHERE p.id = ?""",
            (post_id,),
        ).fetchone()
    post = _row_to_post(row)
    if not post:
        return None
    if not include_nonpublic and not _post_public_status(post["status"]):
        return None
    return post


def update_post(
    post_id: int,
    owner_id: int,
    patch: dict,
    is_admin: bool = False,
) -> dict:
    _ensure_db()
    allowed = {"title", "category", "content", "city"}
    clean = {k: v for k, v in patch.items() if k in allowed}
    if "category" in clean:
        _validate_post_category(clean["category"])

    with get_db() as conn:
        row = conn.execute(
            "SELECT owner_id FROM community_posts WHERE id = ?",
            (post_id,),
        ).fetchone()
        if not row:
            raise KeyError(post_id)
        if row["owner_id"] != owner_id and not is_admin:
            raise PermissionError(f"User {owner_id} does not own post {post_id}")
        if clean:
            clean["updated_at"] = _now()
            set_clause = ", ".join(f"{k} = ?" for k in clean)
            conn.execute(
                f"UPDATE community_posts SET {set_clause} WHERE id = ?",
                list(clean.values()) + [post_id],
            )
        row = conn.execute(
            """SELECT p.*, u.name AS owner_name, u.avatar AS owner_avatar, u.is_admin AS owner_is_admin,
                      (SELECT COUNT(*) FROM community_post_replies r
                       WHERE r.post_id = p.id AND r.status = 'active') AS reply_count
               FROM community_posts p
               JOIN users u ON u.id = p.owner_id
               WHERE p.id = ?""",
            (post_id,),
        ).fetchone()
    return _row_to_post(row)


def delete_post(post_id: int, owner_id: int, is_admin: bool = False) -> None:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute(
            "SELECT owner_id FROM community_posts WHERE id = ?",
            (post_id,),
        ).fetchone()
        if not row:
            raise KeyError(post_id)
        if row["owner_id"] != owner_id and not is_admin:
            raise PermissionError(f"User {owner_id} does not own post {post_id}")
        now = _now()
        conn.execute(
            "UPDATE community_posts SET status = 'removed', updated_at = ? WHERE id = ?",
            (now, post_id),
        )
        conn.execute(
            "UPDATE community_post_replies SET status = 'removed', updated_at = ? WHERE post_id = ?",
            (now, post_id),
        )


def list_post_replies(post_id: int, include_nonpublic: bool = False) -> list:
    _ensure_db()
    clauses = ["r.post_id = ?"]
    params = [post_id]
    if not include_nonpublic:
        clauses.append("r.status = 'active'")
    where = " AND ".join(clauses)
    with get_db() as conn:
        rows = conn.execute(
            f"""SELECT r.*, u.name AS owner_name, u.avatar AS owner_avatar, u.is_admin AS owner_is_admin
                FROM community_post_replies r
                JOIN users u ON u.id = r.owner_id
                WHERE {where}
                ORDER BY r.created_at ASC""",
            params,
        ).fetchall()
    return [_row_to_reply(row) for row in rows]


def create_post_reply(post_id: int, owner_id: int, content: str) -> dict:
    _ensure_db()
    now = _now()
    with get_db() as conn:
        post = conn.execute(
            "SELECT id, status FROM community_posts WHERE id = ?",
            (post_id,),
        ).fetchone()
        if not post or post["status"] != "active":
            raise KeyError(post_id)
        cur = conn.execute(
            """INSERT INTO community_post_replies
               (post_id, owner_id, content, status, created_at, updated_at)
               VALUES (?, ?, ?, 'active', ?, ?)""",
            (post_id, owner_id, content, now, now),
        )
        row = conn.execute(
            """SELECT r.*, u.name AS owner_name, u.avatar AS owner_avatar, u.is_admin AS owner_is_admin
               FROM community_post_replies r
               JOIN users u ON u.id = r.owner_id
               WHERE r.id = ?""",
            (cur.lastrowid,),
        ).fetchone()
    return _row_to_reply(row)


def delete_post_reply(reply_id: int, owner_id: int, is_admin: bool = False) -> None:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute(
            "SELECT owner_id FROM community_post_replies WHERE id = ?",
            (reply_id,),
        ).fetchone()
        if not row:
            raise KeyError(reply_id)
        if row["owner_id"] != owner_id and not is_admin:
            raise PermissionError(f"User {owner_id} does not own reply {reply_id}")
        conn.execute(
            "UPDATE community_post_replies SET status = 'removed', updated_at = ? WHERE id = ?",
            (_now(), reply_id),
        )
