"""Reconcile articles.enrichment_status with the actual stored Chinese content.

Run once after the enrichment-state-repair migration lands:

    python scripts/repair_enrichment_status.py             # apply
    python scripts/repair_enrichment_status.py --dry-run   # preview only

The repair is idempotent: subsequent runs will report 0 changes once status is
in sync with content. Never blanks out existing title_zh / content_zh.
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import MAX_ENRICHMENT_ATTEMPTS
from backend.database import get_db
from backend.storage.base import _ensure_db
from backend.storage.news import repair_enrichment_status


def _preview() -> dict:
    """Count what repair_enrichment_status would change, without writing."""
    _ensure_db()
    with get_db() as conn:
        done_count = conn.execute(
            """SELECT COUNT(*) FROM articles
               WHERE enrichment_status != 'done'
                 AND COALESCE(title_zh, '') != ''
                 AND COALESCE(content_zh, '') != ''"""
        ).fetchone()[0]
        failed_count = conn.execute(
            """SELECT COUNT(*) FROM articles
               WHERE enrichment_status NOT IN ('done', 'failed')
                 AND COALESCE(enrichment_attempts, 0) >= ?
                 AND (COALESCE(title_zh, '') = '' OR COALESCE(content_zh, '') = '')""",
            (MAX_ENRICHMENT_ATTEMPTS,),
        ).fetchone()[0]
    return {"marked_done": done_count, "marked_failed": failed_count}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dry-run", action="store_true", help="Report counts without writing")
    args = parser.parse_args()

    preview = _preview()
    print(f"Would mark done:   {preview['marked_done']}")
    print(f"Would mark failed: {preview['marked_failed']}")

    if args.dry_run:
        return 0
    if preview["marked_done"] == 0 and preview["marked_failed"] == 0:
        print("Nothing to repair.")
        return 0

    result = repair_enrichment_status()
    print(f"Marked done:   {result['marked_done']}")
    print(f"Marked failed: {result['marked_failed']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
