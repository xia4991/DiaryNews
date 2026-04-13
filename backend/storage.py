import json
import logging
import os
from typing import Optional

from backend.config import MAX_ARTICLES, MAX_VIDEOS
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
    _migrate_from_json()


# ── Migration ─────────────────────────────────────────────────────────────────

def _migrate_from_json() -> None:
    news_path = "data/news.json"
    yt_path = "data/youtube.json"

    if os.path.exists(news_path):
        try:
            with open(news_path, encoding="utf-8") as f:
                data = json.load(f)
            articles = data.get("articles", [])
            if articles:
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


# ── Metadata helpers ──────────────────────────────────────────────────────────

def _set_meta(key: str, value: str) -> None:
    with get_db() as conn:
        conn.execute("INSERT OR REPLACE INTO metadata (key, value) VALUES (?,?)", (key, value))


def _get_meta(key: str) -> Optional[str]:
    with get_db() as conn:
        row = conn.execute("SELECT value FROM metadata WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else None


# ── News ──────────────────────────────────────────────────────────────────────

def load_news() -> dict:
    _ensure_db()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM articles ORDER BY published DESC LIMIT ?", (MAX_ARTICLES,)
        ).fetchall()
    return {
        "last_updated": _get_meta("news_last_updated"),
        "articles": [dict(r) for r in rows],
    }


def save_news(data: dict) -> None:
    _ensure_db()
    _bulk_upsert_articles(data.get("articles", []))
    last = data.get("last_updated")
    if last:
        _set_meta("news_last_updated", last)
    _trim_articles()


def _bulk_upsert_articles(articles: list) -> None:
    with get_db() as conn:
        conn.executemany(
            """INSERT OR REPLACE INTO articles
               (link, title, summary, source, category, published, scraped_content, ai_summary)
               VALUES (:link,:title,:summary,:source,:category,:published,:scraped_content,:ai_summary)""",
            [
                {
                    "link":            a.get("link", ""),
                    "title":           a.get("title", ""),
                    "summary":         a.get("summary", ""),
                    "source":          a.get("source", ""),
                    "category":        a.get("category", ""),
                    "published":       a.get("published", ""),
                    "scraped_content": a.get("scraped_content", ""),
                    "ai_summary":      a.get("ai_summary", ""),
                }
                for a in articles
            ],
        )


def _trim_articles() -> None:
    with get_db() as conn:
        conn.execute(
            """DELETE FROM articles WHERE link NOT IN (
                SELECT link FROM articles ORDER BY published DESC LIMIT ?
            )""",
            (MAX_ARTICLES,),
        )


def merge_articles(existing: list, new_articles: list) -> list:
    seen = {a["link"] for a in existing}
    merged = list(existing)
    for a in new_articles:
        if a["link"] not in seen:
            merged.append(a)
            seen.add(a["link"])
    merged.sort(key=lambda a: a["published"], reverse=True)
    return merged[:MAX_ARTICLES]


# ── YouTube ───────────────────────────────────────────────────────────────────

def load_youtube() -> dict:
    _ensure_db()
    with get_db() as conn:
        channels = [dict(r) for r in conn.execute("SELECT * FROM channels").fetchall()]
        rows = conn.execute(
            """SELECT v.*, c.text, c.language, c.tier, c.fetched_at, c.summary,
                      CASE WHEN c.video_id IS NOT NULL THEN 1 ELSE 0 END AS _cap_attempted
               FROM videos v
               LEFT JOIN captions c ON v.video_id = c.video_id
               ORDER BY v.published DESC
               LIMIT ?""",
            (MAX_VIDEOS,),
        ).fetchall()

    videos = []
    for r in rows:
        v = {
            "video_id":     r["video_id"],
            "title":        r["title"],
            "channel_name": r["channel_name"],
            "channel_id":   r["channel_id"],
            "published":    r["published"],
            "thumbnail":    r["thumbnail"],
            "link":         r["link"],
        }
        if r["_cap_attempted"]:
            if r["text"] is None:
                v["caption"] = None
            else:
                v["caption"] = {
                    "text":       r["text"],
                    "language":   r["language"],
                    "tier":       r["tier"],
                    "fetched_at": r["fetched_at"],
                    "summary":    r["summary"],
                }
        videos.append(v)

    return {
        "last_updated": _get_meta("youtube_last_updated"),
        "channels": channels,
        "videos": videos,
    }


def save_youtube(data: dict) -> None:
    _ensure_db()
    last = data.get("last_updated")
    if last:
        _set_meta("youtube_last_updated", last)


# ── Caption helpers ───────────────────────────────────────────────────────────

def save_caption(video_id: str, caption) -> None:
    _ensure_db()
    if caption is None:
        _mark_caption_failed(video_id)
        return
    with get_db() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO captions (video_id, text, language, tier, fetched_at, summary)
               VALUES (?,?,?,?,?,?)""",
            (video_id, caption.get("text"), caption.get("language"),
             caption.get("tier"), caption.get("fetched_at"), caption.get("summary")),
        )


def _mark_caption_failed(video_id: str) -> None:
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO captions (video_id, text) VALUES (?, NULL)",
            (video_id,),
        )


def clear_caption(video_id: str) -> None:
    _ensure_db()
    with get_db() as conn:
        conn.execute("DELETE FROM captions WHERE video_id = ?", (video_id,))


# ── Channel helpers ───────────────────────────────────────────────────────────

def add_channel(handle: str, name: str, category: str) -> None:
    _ensure_db()
    with get_db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO channels (handle, name, channel_id, category) VALUES (?,?,NULL,?)",
            (handle, name, category),
        )


def remove_channel(handle: str) -> None:
    _ensure_db()
    with get_db() as conn:
        row = conn.execute("SELECT channel_id FROM channels WHERE handle = ?", (handle,)).fetchone()
        conn.execute("DELETE FROM channels WHERE handle = ?", (handle,))
        if row and row["channel_id"]:
            video_ids = [
                r["video_id"] for r in
                conn.execute("SELECT video_id FROM videos WHERE channel_id = ?", (row["channel_id"],)).fetchall()
            ]
            if video_ids:
                conn.execute(
                    f"DELETE FROM captions WHERE video_id IN ({','.join('?'*len(video_ids))})",
                    video_ids,
                )
            conn.execute("DELETE FROM videos WHERE channel_id = ?", (row["channel_id"],))


def update_channel_id(handle: str, channel_id: str, name: str) -> None:
    _ensure_db()
    with get_db() as conn:
        conn.execute(
            "UPDATE channels SET channel_id = ?, name = ? WHERE handle = ?",
            (channel_id, name, handle),
        )


def update_videos(new_videos: list, last_updated: str) -> None:
    _ensure_db()
    with get_db() as conn:
        conn.executemany(
            """INSERT OR IGNORE INTO videos
               (video_id, title, channel_name, channel_id, published, thumbnail, link)
               VALUES (?,?,?,?,?,?,?)""",
            [(v["video_id"], v.get("title"), v.get("channel_name"), v.get("channel_id"),
              v.get("published"), v.get("thumbnail"), v.get("link")) for v in new_videos],
        )
    _set_meta("youtube_last_updated", last_updated)
    _trim_videos()


def _trim_videos() -> None:
    with get_db() as conn:
        conn.execute(
            """DELETE FROM videos WHERE video_id NOT IN (
                SELECT video_id FROM videos ORDER BY published DESC LIMIT ?
            )""",
            (MAX_VIDEOS,),
        )


# ── Ideas ─────────────────────────────────────────────────────────────────────

def load_ideas() -> list:
    _ensure_db()
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM ideas ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


def save_idea(title: str, category: str, content: str) -> dict:
    _ensure_db()
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO ideas (title, category, content, created_at, updated_at) VALUES (?,?,?,?,?)",
            (title, category, content, now, now),
        )
        row = conn.execute("SELECT * FROM ideas WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)


def update_idea(idea_id: int, title: str, category: str, content: str) -> dict:
    _ensure_db()
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute(
            "UPDATE ideas SET title=?, category=?, content=?, updated_at=? WHERE id=?",
            (title, category, content, now, idea_id),
        )
        row = conn.execute("SELECT * FROM ideas WHERE id = ?", (idea_id,)).fetchone()
    if row is None:
        raise KeyError(idea_id)
    return dict(row)


def delete_idea(idea_id: int) -> None:
    _ensure_db()
    with get_db() as conn:
        conn.execute("DELETE FROM ideas WHERE id = ?", (idea_id,))
