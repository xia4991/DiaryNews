"""
Orchestration layer — business logic that coordinates fetching, processing, and storage.
No FastAPI imports. All functions are synchronous.
"""

import logging
import threading
import time
from datetime import datetime, timezone
from io import BytesIO

from backend import storage
from backend.config import MAX_ENRICHMENT_ATTEMPTS, MINIMAX_RATE_LIMIT_SLEEP_SEC
from backend.crawler import run_all
from backend.llm import (
    MiniMaxConfigError,
    MiniMaxError,
    batch_enrich_news_articles,
    enrich_news_article,
)
from backend.news import ensure_scraped_content
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
        result = {
            "new_count": len(new_articles),
            "last_updated": now,
            "sources": health,
            "stats": stats,
        }
        storage.add_log(
            "news_collect",
            f"新闻抓取完成: {result['new_count']}条新文章",
            {
                "new_count": result["new_count"],
                "sources": result["sources"],
                "stats": result.get("stats", {}),
            },
        )
        return result
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
    Sleeps `MINIMAX_RATE_LIMIT_SLEEP_SEC` between iterations to respect MiniMax
    rate limits — the sleep used to live inside `call_minimax()` itself, which
    silently delayed one-off callers like brief generation.
    """
    if not _enrich_lock.acquire(blocking=False):
        return {"status": "already_running", "retried_count": 0, "done_count": 0}
    try:
        pending = storage.list_pending_enrichment(limit=max_retry)
        if not pending:
            return {"retried_count": 0, "done_count": 0}

        enriched: list = []
        done = 0
        aborted_reason = ""
        for index, article in enumerate(pending):
            if index > 0 and MINIMAX_RATE_LIMIT_SLEEP_SEC > 0:
                time.sleep(MINIMAX_RATE_LIMIT_SLEEP_SEC)
            link = article["link"]
            new_attempts = (article.get("enrichment_attempts") or 0) + 1
            try:
                text_for_llm, scraped_content = ensure_scraped_content(article)
                updated = enrich_news_article(article, text_for_llm, scraped_content)
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
            except MiniMaxConfigError as exc:
                # Operator-fixable; no point burning attempts across the rest of the batch.
                log.error(
                    "MiniMax config error during enrichment, aborting cycle: %s", exc
                )
                storage.mark_enrichment_status(
                    link, "pending", increment_attempts=False,
                    error=f"MiniMaxConfigError: {exc}",
                )
                aborted_reason = "config"
                break
            except MiniMaxError as exc:
                # Transient (rate-limit, timeout, 5xx) already retried inside call_minimax.
                # Only flip to failed once the per-row retry ceiling is hit.
                log.warning(
                    "MiniMax %s for '%s' (attempt %d/%d): %s",
                    type(exc).__name__, link, new_attempts, MAX_ENRICHMENT_ATTEMPTS, exc,
                )
                will_be_failed = new_attempts >= MAX_ENRICHMENT_ATTEMPTS
                storage.mark_enrichment_status(
                    link, "failed" if will_be_failed else "pending",
                    increment_attempts=True,
                    error=f"{type(exc).__name__}: {str(exc)[:300]}",
                )
            except Exception as exc:  # noqa: BLE001
                log.exception("Unexpected error enriching '%s'", link)
                storage.mark_enrichment_status(
                    link, "failed", increment_attempts=True,
                    error=f"{type(exc).__name__}: {str(exc)[:300]}",
                )

        if enriched:
            now = datetime.now(timezone.utc).isoformat()
            storage.save_news({"last_updated": now, "articles": enriched})
            log.info("Stage B enriched %d articles (%d marked done)", len(enriched), done)

        result = {"retried_count": len(enriched), "done_count": done}
        if aborted_reason:
            result["aborted"] = aborted_reason
        storage.add_log(
            "news_llm",
            f"LLM处理完成: 处理{result['retried_count']}条, 成功{result['done_count']}条",
            result,
        )
        return result
    finally:
        _enrich_lock.release()


def _next_enrichment_status(article: dict) -> str:
    attempts = (article.get("enrichment_attempts") or 0) + 1
    return "failed" if attempts >= MAX_ENRICHMENT_ATTEMPTS else "pending"


def _mark_batch_unresolved(article: dict, reason: str) -> None:
    storage.mark_enrichment_status(
        article["link"],
        _next_enrichment_status(article),
        increment_attempts=True,
        error=reason,
    )


def batch_enrich_pending_news(limit: int = 20) -> dict:
    """Run one compact LLM call for up to 20 pending articles."""
    limit = max(1, min(int(limit or 20), 20))
    if not _enrich_lock.acquire(blocking=False):
        return {
            "status": "already_running",
            "selected_count": 0,
            "done_count": 0,
            "failed_count": 0,
        }
    try:
        pending = storage.list_pending_enrichment(limit=limit)
        if not pending:
            return {"selected_count": 0, "done_count": 0, "failed_count": 0}
        storage.add_log(
            "news_llm_batch",
            f"批量LLM开始: 选择{len(pending)}条",
            {"selected_count": len(pending)},
        )

        enriched = []
        matched_indexes = set()
        invalid_rows = 0
        row_count = 0
        extra_rows = 0
        aborted_reason = ""

        if pending:
            try:
                batch_result = batch_enrich_news_articles(pending)
                enriched = batch_result["enriched"]
                matched_indexes = batch_result["matched_indexes"]
                invalid_rows = batch_result["invalid_rows"]
                row_count = batch_result["row_count"]
                extra_rows = batch_result["extra_rows"]
            except MiniMaxConfigError as exc:
                log.error("MiniMax config error during batch enrichment: %s", exc)
                aborted_reason = "config"
            except MiniMaxError as exc:
                log.warning("MiniMax batch enrichment failed: %s: %s", type(exc).__name__, exc)
                for article in pending:
                    _mark_batch_unresolved(
                        article,
                        f"{type(exc).__name__}: {str(exc)[:300]}",
                    )
                result = {
                    "selected_count": len(pending),
                    "done_count": 0,
                    "failed_count": len(pending),
                    "invalid_rows": 0,
                    "row_count": 0,
                    "extra_rows": 0,
                    "missing_count": len(pending),
                    "error_type": type(exc).__name__,
                    "error": str(exc)[:300],
                }
                storage.add_log("news_llm_batch", "批量LLM失败", result)
                return result

        if aborted_reason:
            result = {
                "selected_count": len(pending),
                "done_count": 0,
                "failed_count": 0,
                "aborted": aborted_reason,
            }
            storage.add_log("news_llm_batch", "批量LLM配置错误，已中止", result)
            return result

        for updated in enriched:
            new_attempts = (updated.get("enrichment_attempts") or 0) + 1
            updated["enrichment_status"] = "done"
            updated["enrichment_attempts"] = new_attempts
            updated["enrichment_error"] = ""

        if enriched:
            now = datetime.now(timezone.utc).isoformat()
            storage.save_news({"last_updated": now, "articles": enriched})
            log.info("Batch enriched %d articles", len(enriched))

        missing_articles = [
            article for index, article in enumerate(pending)
            if index not in matched_indexes
        ]
        for article in missing_articles:
            _mark_batch_unresolved(article, "批量LLM未返回对应序号或返回内容无效")

        missing_count = len(missing_articles)
        result = {
            "selected_count": len(pending),
            "done_count": len(enriched),
            "failed_count": len(pending) - len(enriched),
            "missing_count": missing_count,
            "invalid_rows": invalid_rows,
            "row_count": row_count,
            "extra_rows": extra_rows,
        }
        storage.add_log(
            "news_llm_batch",
            f"批量LLM完成: 选择{result['selected_count']}条, 成功{result['done_count']}条",
            result,
        )
        return result
    finally:
        _enrich_lock.release()


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
