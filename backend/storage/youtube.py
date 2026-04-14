from backend.config import MAX_VIDEOS
from backend.database import get_db
from backend.storage.base import _ensure_db, _get_meta, _set_meta


# ── YouTube data ─────────────────────────────────────────────────────────────

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


# ── Videos ───────────────────────────────────────────────────────────────────

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


# ── Channels ─────────────────────────────────────────────────────────────────

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


# ── Captions ─────────────────────────────────────────────────────────────────

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
