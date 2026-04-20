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

log = logging.getLogger("diarynews.services")


# ── News ─────────────────────────────────────────────────────────────────────

def fetch_and_save_news(max_new: int = 0, max_retry: int = 20, max_age_hours: int = 24) -> dict:
    """Fetch new feeds first (fast), then retry incomplete articles.

    max_new: cap on new articles to enrich (0 = unlimited, used by manual fetch).
    max_retry: cap on incomplete articles to retry per cycle.
    """
    data = storage.load_news()
    existing = data.get("articles", [])
    existing_urls = {a["link"] for a in existing}

    # Step 1: Fetch & save new articles (fast when most already exist)
    new_articles = fetch_all_feeds(existing_urls=existing_urls, max_articles=max_new, max_age_hours=max_age_hours)
    now = datetime.now(timezone.utc).isoformat()
    if new_articles:
        storage.save_news({"last_updated": now, "articles": new_articles})

    # Step 2: Retry incomplete articles (missing translation or tags)
    incomplete = [a for a in existing
                  if not a.get("title_zh") or not a.get("content_zh") or not a.get("tags_zh")][:max_retry]
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

    storage.add_log("news_fetch",
        f"抓取完成: {len(new_articles)}条新文章, {len(retried)}条重试",
        {"new_count": len(new_articles), "retried_count": len(retried)})

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
    storage.add_log("listing_moderate",
        f"信息#{listing_id} 状态变更为 {status}",
        {"listing_id": listing_id, "admin_id": admin_id, "status": status})
    return {**listing, "reports_resolved": resolved}


