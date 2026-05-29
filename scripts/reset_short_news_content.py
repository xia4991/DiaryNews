"""Reset short enriched news rows so batch enrichment can rebuild full content.

Rows produced before batch enrichment scraped article bodies may have a Chinese
body that is only a title-sized summary while still being marked `done`.

Usage:
    python scripts/reset_short_news_content.py --dry-run
    python scripts/reset_short_news_content.py --apply
    python scripts/reset_short_news_content.py --min-content-chars 220 --apply
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.storage.database import get_db


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--min-content-chars",
        type=int,
        default=180,
        help="Rows with content_zh shorter than this are reset (default: 180)",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually update rows. Without this flag the script only previews.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview only. Kept for symmetry with other maintenance scripts.",
    )
    args = parser.parse_args()

    if args.min_content_chars <= 0:
        print("min-content-chars must be positive.")
        return 1

    with get_db() as conn:
        rows = conn.execute(
            """SELECT source, COUNT(*) AS c
               FROM articles
               WHERE enrichment_status = 'done'
                 AND LENGTH(COALESCE(content_zh, '')) > 0
                 AND LENGTH(COALESCE(content_zh, '')) < ?
               GROUP BY source
               ORDER BY c DESC, source ASC""",
            (args.min_content_chars,),
        ).fetchall()

    total = sum(row["c"] for row in rows)
    print(f"{total} done articles have content_zh < {args.min_content_chars} chars")
    for row in rows:
        print(f"- {row['source'] or 'unknown'}: {row['c']}")

    if not args.apply or args.dry_run or total == 0:
        return 0

    with get_db() as conn:
        cur = conn.execute(
            """UPDATE articles
               SET enrichment_status = 'pending',
                   enrichment_attempts = 0,
                   enrichment_error = 'reset_short_content',
                   content_zh = '',
                   summary_zh = ''
               WHERE enrichment_status = 'done'
                 AND LENGTH(COALESCE(content_zh, '')) > 0
                 AND LENGTH(COALESCE(content_zh, '')) < ?""",
            (args.min_content_chars,),
        )
    print(f"Reset {cur.rowcount} articles to pending.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
