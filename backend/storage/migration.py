import json
import logging
import os

from backend.database import get_db
from backend.storage.base import _set_meta

log = logging.getLogger("diarynews.storage")


def _migrate_from_json() -> None:
    news_path = "data/news.json"
    yt_path = "data/youtube.json"

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

    if os.path.exists(yt_path):
        try:
            with open(yt_path, encoding="utf-8") as f:
                data = json.load(f)
            channels = data.get("channels", [])
            videos = data.get("videos", [])
            if channels:
                with get_db() as conn:
                    conn.executemany(
                        "INSERT OR IGNORE INTO channels (handle, name, channel_id, category) VALUES (?,?,?,?)",
                        [(c["handle"], c.get("name"), c.get("channel_id"), c.get("category")) for c in channels],
                    )
            if videos:
                with get_db() as conn:
                    conn.executemany(
                        """INSERT OR IGNORE INTO videos
                           (video_id, title, channel_name, channel_id, published, thumbnail, link)
                           VALUES (?,?,?,?,?,?,?)""",
                        [(v["video_id"], v.get("title"), v.get("channel_name"), v.get("channel_id"),
                          v.get("published"), v.get("thumbnail"), v.get("link")) for v in videos],
                    )
                caption_rows = []
                for v in videos:
                    if "caption" in v:
                        cap = v.get("caption")
                        caption_rows.append((
                            v["video_id"],
                            cap.get("text") if cap else None,
                            cap.get("language") if cap else None,
                            cap.get("tier") if cap else None,
                            cap.get("fetched_at") if cap else None,
                            cap.get("summary") if cap else None,
                        ))
                if caption_rows:
                    with get_db() as conn:
                        conn.executemany(
                            "INSERT OR REPLACE INTO captions (video_id, text, language, tier, fetched_at, summary) VALUES (?,?,?,?,?,?)",
                            caption_rows,
                        )
            last = data.get("last_updated")
            if last:
                _set_meta("youtube_last_updated", last)
            log.info("Migrated %d channels, %d videos from %s", len(channels), len(videos), yt_path)
            os.rename(yt_path, yt_path + ".migrated")
        except Exception as exc:
            log.warning("YouTube JSON migration failed: %s", exc)
