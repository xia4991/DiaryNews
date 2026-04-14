import logging
import os
from typing import Optional

from backend.database import get_db, init_db

log = logging.getLogger("diarynews.storage")

_db_ready = False


def _ensure_db() -> None:
    global _db_ready
    if _db_ready:
        return
    os.makedirs("data", exist_ok=True)
    init_db()
    _db_ready = True
    from backend.storage.migration import _migrate_from_json
    _migrate_from_json()


def _set_meta(key: str, value: str) -> None:
    with get_db() as conn:
        conn.execute("INSERT OR REPLACE INTO metadata (key, value) VALUES (?,?)", (key, value))


def _get_meta(key: str) -> Optional[str]:
    with get_db() as conn:
        row = conn.execute("SELECT value FROM metadata WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else None
