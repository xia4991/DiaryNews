"""Render the batch article LLM prompt for local testing.

Loads the latest articles from the SQLite database and prints the exact prompt
created by backend.llm.prompts.batch_article_chinese_prompt().

Usage:
    python scripts/render_batch_article_prompt.py
    python scripts/render_batch_article_prompt.py --limit 10
    python scripts/render_batch_article_prompt.py --status pending
"""

import argparse
import os
import sqlite3
import sys
from typing import Optional

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

from backend.config import DB_PATH
from backend.llm.prompts import batch_article_chinese_prompt


def _resolved_db_path() -> str:
    return DB_PATH if os.path.isabs(DB_PATH) else os.path.join(ROOT_DIR, DB_PATH)


def load_latest_articles(limit: int, status: Optional[str] = None) -> list[dict]:
    params: list = []
    where = ""
    if status:
        where = "WHERE enrichment_status = ? and COALESCE(scraped_content, '') != ''"
        params.append(status)
    else:
        where = "WHERE COALESCE(scraped_content, '') != ''"

    params.append(limit)
    db_path = _resolved_db_path()
    uri = f"file:{db_path}?mode=ro"
    with sqlite3.connect(uri, uri=True) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            f"""SELECT title, summary, scraped_content
                FROM articles
                {where}
                ORDER BY fetched_at DESC, published DESC
                LIMIT ?""",
            params,
        ).fetchall()
    return [dict(row) for row in rows]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Number of latest articles to include (default: 20)",
    )
    parser.add_argument(
        "--status",
        choices=["pending", "done", "failed"],
        help="Optional enrichment_status filter",
    )
    args = parser.parse_args()

    if args.limit <= 0:
        parser.error("--limit must be greater than 0")

    articles = load_latest_articles(args.limit, args.status)
    if not articles:
        print("No articles found.", file=sys.stderr)
        return 1

    print(batch_article_chinese_prompt(articles))
    return 0


if __name__ == "__main__":
    sys.exit(main())
