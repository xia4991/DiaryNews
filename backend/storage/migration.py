import json
import logging
import os

from backend.storage.base import _set_meta

log = logging.getLogger("diarynews.storage")


def _migrate_from_json() -> None:
    news_path = "data/news.json"

    if os.path.exists(news_path):
        try:
            with open(news_path, encoding="utf-8") as f:
                data = json.load(f)
            articles = data.get("articles", [])
            if articles:
                from backend.storage.news import _bulk_upsert_articles
                _bulk_upsert_articles(articles)
                last = data.get("last_updated")
                if last:
                    _set_meta("news_last_updated", last)
                log.info("Migrated %d articles from %s", len(articles), news_path)
            os.rename(news_path, news_path + ".migrated")
        except Exception as exc:
            log.warning("News JSON migration failed: %s", exc)
