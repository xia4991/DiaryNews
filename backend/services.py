"""
Orchestration layer — business logic that coordinates fetching, processing, and storage.
No FastAPI imports. All functions are synchronous.
"""

import logging
import threading
from datetime import datetime, timezone
from io import BytesIO

from backend import storage
from backend.config import MAX_ENRICHMENT_ATTEMPTS
from backend.crawler import run_all
from backend.news import re_enrich_article
from backend.storage_media import get_media_storage

log = logging.getLogger("diarynews.services")


# ── News ─────────────────────────────────────────────────────────────────────

_collect_lock = threading.Lock()
_enrich_lock = threading.Lock()


def collect_news(max_new: int = 0, max_age_hours: int = 24) -> dict:
    """Stage A — run all RSS adapters, persist raw articles as pending, update source_health.

    Fast (~ a few hundred ms per adapter). Returns counts + per-source health summary
    plus a `stats` dict explaining where articles went between raw fetch and final save
    (existing-skip / dedupe-skip / age-skip / cap-skip).
    Non-blocking: if another collect is already running, returns status='already_running'.
    """
    if not _collect_lock.acquire(blocking=False):
        return {
            "status": "already_running",
            "new_count": 0,
            "last_updated": "",
            "sources": [],
            "stats": {},
        }
    try:
        data = storage.load_news()
        existing_urls = {a["link"] for a in data.get("articles", [])}

        new_articles, results, stats = run_all(
            existing_urls=existing_urls,
            max_age_hours=max_age_hours,
            max_articles=max_new,
        )
        now = datetime.now(timezone.utc).isoformat()
        if new_articles:
            storage.save_raw_articles(new_articles, last_updated=now)
        else:
            storage.save_raw_articles([], last_updated=now)

        health = [
            {
                "source": r.source,
                "status": r.status,
                "entries": r.entries_count,
                "articles": len(r.articles),
                "duration_ms": r.duration_ms,
                "error": r.error,
            }
            for r in results
        ]
        return {
            "new_count": len(new_articles),
            "last_updated": now,
            "sources": health,
            "stats": stats,
        }
    finally:
        _collect_lock.release()


def _enrichment_failure_reason(updated: dict) -> str:
    """Short human-readable reason for why a Stage B run did not produce a complete row."""
    has_title = bool(updated.get("title_zh"))
    has_content = bool(updated.get("content_zh"))
    if not has_title and not has_content:
        return "LLM 未返回有效字段"
    if not has_title:
        return "LLM 响应缺失 TITLE_ZH"
    return "LLM 响应缺失 CONTENT_ZH"


def enrich_pending_news(max_retry: int = 20) -> dict:
    """Stage B — run MiniMax enrichment on articles still missing Chinese fields.

    Non-blocking: if another enrich is already running, returns status='already_running'.
    """
    if not _enrich_lock.acquire(blocking=False):
        return {"status": "already_running", "retried_count": 0, "done_count": 0}
    try:
        pending = storage.list_pending_enrichment(limit=max_retry)
        if not pending:
            return {"retried_count": 0, "done_count": 0}

        enriched: list = []
        done = 0
        for article in pending:
            link = article["link"]
            new_attempts = (article.get("enrichment_attempts") or 0) + 1
            try:
                updated = re_enrich_article(article)
                if updated.get("title_zh") and updated.get("content_zh"):
                    updated["enrichment_status"] = "done"
                    updated["enrichment_attempts"] = new_attempts
                    updated["enrichment_error"] = ""
                    done += 1
                else:
                    reason = _enrichment_failure_reason(updated)
                    updated["enrichment_status"] = (
                        "failed" if new_attempts >= MAX_ENRICHMENT_ATTEMPTS else "pending"
                    )
                    updated["enrichment_attempts"] = new_attempts
                    updated["enrichment_error"] = reason
                enriched.append(updated)
            except Exception as exc:
                log.warning("enrich failed for '%s': %s", link, exc)
                storage.mark_enrichment_status(
                    link, "failed", increment_attempts=True,
                    error=f"{type(exc).__name__}: {exc}",
                )

        if enriched:
            now = datetime.now(timezone.utc).isoformat()
            storage.save_news({"last_updated": now, "articles": enriched})
            log.info("Stage B enriched %d articles (%d marked done)", len(enriched), done)

        return {"retried_count": len(enriched), "done_count": done}
    finally:
        _enrich_lock.release()


def fetch_and_save_news(max_new: int = 0, max_retry: int = 20, max_age_hours: int = 24) -> dict:
    """Stage A + Stage B inline — preserves the legacy /api/news/fetch behavior."""
    collected = collect_news(max_new=max_new, max_age_hours=max_age_hours)
    enriched = enrich_pending_news(max_retry=max_retry)

    storage.add_log(
        "news_fetch",
        f"抓取完成: {collected['new_count']}条新文章, {enriched['retried_count']}条重试",
        {
            "new_count": collected["new_count"],
            "retried_count": enriched["retried_count"],
            "done_count": enriched["done_count"],
            "sources": collected["sources"],
            "stats": collected.get("stats", {}),
        },
    )

    return {
        "new_count": collected["new_count"],
        "retried_count": enriched["retried_count"],
        "done_count": enriched["done_count"],
        "last_updated": collected["last_updated"],
        "sources": collected["sources"],
        "stats": collected.get("stats", {}),
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


