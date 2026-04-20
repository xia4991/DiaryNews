import json
from datetime import datetime, timezone
from typing import Optional

from backend.database import get_db
from backend.storage.base import _ensure_db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def add_log(event_type: str, message: str, details: dict = None) -> None:
    _ensure_db()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO admin_logs (event_type, message, details, created_at)"
            " VALUES (?, ?, ?, ?)",
            (event_type, message, json.dumps(details) if details else None, _now()),
        )


def list_logs(limit: int = 50, offset: int = 0, event_type: Optional[str] = None) -> dict:
    _ensure_db()
    with get_db() as conn:
        where = ""
        params = []
        if event_type:
            where = "WHERE event_type = ?"
            params.append(event_type)

        total = conn.execute(f"SELECT COUNT(*) FROM admin_logs {where}", params).fetchone()[0]
        rows = conn.execute(
            f"SELECT * FROM admin_logs {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()

        items = []
        for row in rows:
            d = dict(row)
            if d.get("details"):
                d["details"] = json.loads(d["details"])
            items.append(d)

        return {"items": items, "total": total}
