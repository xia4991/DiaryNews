"""
Orchestration layer — business logic that coordinates fetching, processing, and storage.
No FastAPI imports. All functions are synchronous.
"""

import logging
from datetime import datetime, timezone

from backend import storage
from backend.news import fetch_all_feeds
from backend.youtube import (
    fetch_all_channels,
    fetch_and_summarize_caption,
    normalise_handle,
    resolve_youtube_channel,
)

log = logging.getLogger("diarynews.services")


# ── News ─────────────────────────────────────────────────────────────────────

def fetch_and_save_news() -> dict:
    """Load existing articles, fetch new feeds, save, return stats."""
    data = storage.load_news()
    existing_urls = {a["link"] for a in data.get("articles", [])}
    new_articles = fetch_all_feeds(existing_urls=existing_urls)
    now = datetime.now(timezone.utc).isoformat()
    storage.save_news({"last_updated": now, "articles": new_articles})
    return {"new_count": len(new_articles), "last_updated": now}


# ── YouTube — channels ───────────────────────────────────────────────────────

class DuplicateChannelError(Exception):
    pass


def add_youtube_channel(handle: str, category: str) -> dict:
    """Normalize handle, check duplicates, save. Returns channel info."""
    handle, _ = normalise_handle(handle)

    yt_data = storage.load_youtube()
    if handle in {ch["handle"] for ch in yt_data.get("channels", [])}:
        raise DuplicateChannelError(f"{handle} already exists.")

    storage.add_channel(handle, handle.lstrip("@"), category)
    return {"handle": handle, "category": category}


def resolve_and_save_channel(handle: str) -> dict:
    """Call YouTube API to resolve channel_id and save it."""
    if not handle.startswith("@"):
        handle = f"@{handle}"
    resolved = resolve_youtube_channel(handle)
    storage.update_channel_id(handle, resolved["channel_id"], resolved["name"])
    return resolved


def remove_youtube_channel(handle: str) -> None:
    """Remove a channel and all its videos/captions."""
    if not handle.startswith("@"):
        handle = f"@{handle}"
    storage.remove_channel(handle)


# ── YouTube — videos ─────────────────────────────────────────────────────────

def fetch_and_save_videos() -> dict:
    """Resolve unresolved channels, fetch all videos, update storage."""
    yt_data = storage.load_youtube()
    channels = yt_data.get("channels", [])

    errors = []
    for ch in channels:
        if not ch.get("channel_id"):
            try:
                resolved = resolve_youtube_channel(ch["handle"])
                storage.update_channel_id(ch["handle"], resolved["channel_id"], resolved["name"])
            except Exception as exc:
                errors.append({"handle": ch["handle"], "error": str(exc)})

    yt_data = storage.load_youtube()
    fetchable = [ch for ch in yt_data["channels"] if ch.get("channel_id")]
    if not fetchable:
        raise ValueError("No resolvable channels.")

    existing_ids = {v["video_id"] for v in yt_data.get("videos", [])}
    new_videos = fetch_all_channels(fetchable, existing_ids)

    now = datetime.now(timezone.utc).isoformat()
    if new_videos:
        storage.update_videos(new_videos, now)

    return {"new_count": len(new_videos), "resolve_errors": errors}


# ── YouTube — captions ───────────────────────────────────────────────────────

def get_or_fetch_caption(video_id: str) -> dict:
    """Check if caption exists, fetch if not, save result."""
    yt_data = storage.load_youtube()
    video = next((v for v in yt_data["videos"] if v["video_id"] == video_id), None)
    if not video:
        raise KeyError(f"Video '{video_id}' not found in database.")

    if "caption" in video:
        return {"caption": video["caption"], "attempted": True}

    result = fetch_and_summarize_caption(video_id, video["title"])
    storage.save_caption(video_id, result)
    return {"caption": result, "attempted": True}
