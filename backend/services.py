"""
Orchestration layer — business logic that coordinates fetching, processing, and storage.
No FastAPI imports. All functions are synchronous.
"""

import logging
from datetime import datetime, timezone
from io import BytesIO

from backend import storage
from backend.news import fetch_all_feeds, re_enrich_article
from backend.storage_media import get_media_storage
from backend.youtube import (
    fetch_all_channels,
    fetch_and_summarize_caption,
    normalise_handle,
    resolve_youtube_channel,
)

log = logging.getLogger("diarynews.services")


# ── News ─────────────────────────────────────────────────────────────────────

def fetch_and_save_news() -> dict:
    """Fetch new feeds first (fast), then retry incomplete articles."""
    data = storage.load_news()
    existing = data.get("articles", [])
    existing_urls = {a["link"] for a in existing}

    # Step 1: Fetch & save new articles (fast when most already exist)
    new_articles = fetch_all_feeds(existing_urls=existing_urls)
    now = datetime.now(timezone.utc).isoformat()
    if new_articles:
        storage.save_news({"last_updated": now, "articles": new_articles})

    # Step 2: Retry incomplete articles (missing translation or tags)
    incomplete = [a for a in existing
                  if not a.get("title_zh") or not a.get("content_zh") or not a.get("tags_zh")][:20]
    retried = []
    for article in incomplete:
        try:
            retried.append(re_enrich_article(article))
        except Exception as exc:
            log.warning("re_enrich failed for '%s': %s", article["link"], exc)
            retried.append(article)

    if retried:
        storage.save_news({"last_updated": now, "articles": retried})
        log.info("Retried LLM for %d incomplete articles", len(retried))

    if not new_articles and not retried:
        storage.save_news({"last_updated": now, "articles": []})

    return {
        "new_count": len(new_articles),
        "retried_count": len(retried),
        "last_updated": now,
    }


# ── Media upload ─────────────────────────────────────────────────────────────

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
THUMB_MAX_SIDE = 400
THUMB_QUALITY = 85

_CONTENT_TYPE_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def process_and_store_image(data: bytes, content_type: str, directory: str = "listings") -> dict:
    """Validate, thumbnail, and persist an uploaded image. Returns storage keys + URLs."""
    from PIL import Image, UnidentifiedImageError  # lazy: Pillow only needed for uploads

    ext = _CONTENT_TYPE_EXT.get((content_type or "").lower())
    if not ext:
        raise ValueError(f"Unsupported content type: {content_type!r}")
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError(f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit")

    try:
        img = Image.open(BytesIO(data))
        img.verify()  # detects truncation / format mismatch
        img = Image.open(BytesIO(data))  # reopen after verify
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError(f"Invalid or corrupt image: {exc}")

    thumb = img.convert("RGB")
    thumb.thumbnail((THUMB_MAX_SIDE, THUMB_MAX_SIDE))
    buf = BytesIO()
    thumb.save(buf, format="JPEG", quality=THUMB_QUALITY, optimize=True)
    thumb_bytes = buf.getvalue()

    media = get_media_storage()
    storage_key = media.store(data, directory, ext)
    thumb_key = media.store(thumb_bytes, directory, "jpg")

    return {
        "storage_key": storage_key,
        "thumb_key": thumb_key,
        "url": media.url(storage_key),
        "thumb_url": media.url(thumb_key),
        "bytes": len(data),
        "width": img.width,
        "height": img.height,
    }


# ── Listings moderation ──────────────────────────────────────────────────────

ADMIN_STATUSES = ("active", "hidden", "removed")


def moderate_listing(listing_id: int, admin_id: int, status: str) -> dict:
    """Admin status transition that also resolves any open reports for the listing."""
    if status not in ADMIN_STATUSES:
        raise ValueError(
            f"Invalid admin status: {status!r}. Must be one of {ADMIN_STATUSES}"
        )
    listing = storage.set_listing_status(listing_id, status)
    resolved = storage.resolve_reports_for_listing(
        listing_id, f"status={status} by admin_id={admin_id}"
    )
    return {**listing, "reports_resolved": resolved}


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
