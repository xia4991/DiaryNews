"""Delete articles whose RSS summary is shorter than MIN_SUMMARY_WORDS.

One-shot cleanup for rows that landed in the DB before the Stage A short-summary
filter was introduced. Safe to re-run — idempotent once the filter is active.

Usage:
    python scripts/purge_short_articles.py --dry-run         # preview
    python scripts/purge_short_articles.py                   # interactive confirm
    python scripts/purge_short_articles.py --min-words 50    # override threshold
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import MIN_SUMMARY_WORDS
from backend.database import get_db


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--min-words", type=int, default=MIN_SUMMARY_WORDS,
                        help=f"Word-count threshold (default: MIN_SUMMARY_WORDS={MIN_SUMMARY_WORDS})")
    parser.add_argument("--dry-run", action="store_true", help="Count only, do not delete")
    args = parser.parse_args()

    if args.min_words <= 0:
        print(f"min-words={args.min_words} disables the filter — nothing to purge.")
        return 0

    with get_db() as conn:
        rows = conn.execute("SELECT link, summary FROM articles").fetchall()
        short_links = [
            r["link"] for r in rows
            if len((r["summary"] or "").split()) < args.min_words
        ]

    total = len(rows)
    print(f"{len(short_links)} of {total} articles have summary < {args.min_words} words")
    if args.dry_run or not short_links:
        return 0

    confirm = input("Type DELETE to confirm permanent removal: ").strip()
    if confirm != "DELETE":
        print("Aborted.")
        return 1

    with get_db() as conn:
        for start in range(0, len(short_links), 500):
            batch = short_links[start:start + 500]
            placeholders = ",".join("?" * len(batch))
            conn.execute(
                f"DELETE FROM articles WHERE link IN ({placeholders})",
                batch,
            )
    print(f"Deleted {len(short_links)} rows.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
