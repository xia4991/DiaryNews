"""CRUD for the source_health table — per-source crawler reliability tracking."""

from typing import Optional

from backend.database import get_db
from backend.storage.base import _ensure_db


def upsert_source_health(
    source: str,
    status: str,
    last_fetched_at: str,
    duration_ms: int,
    entries_count: int,
    articles_count: int,
    error: Optional[str] = None,
) -> None:
    """Record one fetch cycle's outcome for a source.

    `consecutive_failures` resets to 0 on `ok`, increments on `http_error`/`parse_error`.
    `status='empty'` (feed parsed fine but had 0 entries) is non-fatal and doesn't bump
    the failure counter — only resets `last_fetched_at` and stats.
    """
    _ensure_db()
    with get_db() as conn:
        row = conn.execute(
            "SELECT consecutive_failures, total_fetches FROM source_health WHERE source = ?",
            (source,),
        ).fetchone()

        prev_failures = row["consecutive_failures"] if row else 0
        prev_total = row["total_fetches"] if row else 0

        if status == "ok":
            new_failures = 0
        elif status == "empty":
            new_failures = prev_failures
        else:
            new_failures = prev_failures + 1

        conn.execute(
            """INSERT INTO source_health
               (source, last_fetched_at, last_status, last_error, last_duration_ms,
                entries_count, articles_count, consecutive_failures, total_fetches)
               VALUES (?,?,?,?,?,?,?,?,?)
               ON CONFLICT(source) DO UPDATE SET
                 last_fetched_at      = excluded.last_fetched_at,
                 last_status          = excluded.last_status,
                 last_error           = excluded.last_error,
                 last_duration_ms     = excluded.last_duration_ms,
                 entries_count        = excluded.entries_count,
                 articles_count       = excluded.articles_count,
                 consecutive_failures = excluded.consecutive_failures,
                 total_fetches        = excluded.total_fetches""",
            (
                source,
                last_fetched_at,
                status,
                error,
                duration_ms,
                entries_count,
                articles_count,
                new_failures,
                prev_total + 1,
            ),
        )


def load_source_health() -> list:
    _ensure_db()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM source_health ORDER BY source ASC"
        ).fetchall()
    return [dict(r) for r in rows]
