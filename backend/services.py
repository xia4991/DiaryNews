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
from backend.config import (
    MAX_ENRICHMENT_ATTEMPTS,
    MINIMAX_RATE_LIMIT_SLEEP_SEC,
    RSS_FULLTEXT_MIN_WORDS,
    SCRAPE_MAX_ATTEMPTS,
)
from backend.crawler import run_all
from backend.dedup import group_articles
from backend.llm import (
    MiniMaxConfigError,
    MiniMaxError,
    MiniMaxHTTPError,
    MiniMaxRateLimitError,
    batch_enrich_news_articles,
    enrich_news_article,
)
from backend.news import (
    compute_content_hash,
    ensure_scraped_content,
    extract_rss_fulltext,
    reset_scrape_caches,
)
from backend.storage_media import get_media_storage

log = logging.getLogger("diarynews.services")


# ── News ─────────────────────────────────────────────────────────────────────

_collect_lock = threading.Lock()
_enrich_lock = threading.Lock()


def _adopt_rss_fulltext(articles: list[dict]) -> int:
    """Use feed-provided full bodies (content:encoded) as scraped_content.

    Mutates each article dict in place: drops the in-memory `rss_full_html` key and,
    when the feed shipped a full body, cleans it via trafilatura and (if it clears
    RSS_FULLTEXT_MIN_WORDS) stores it as `scraped_content`. This lets Stage B reuse the
    body and skip scraping the page entirely for sources like DN and ECO. Returns the
    number of articles whose scraped_content was populated from the feed.
    """
    adopted = 0
    for a in articles:
        html = a.pop("rss_full_html", "") or ""
        if a.get("scraped_content") or not html:
            continue
        text = extract_rss_fulltext(html)
        if text and (RSS_FULLTEXT_MIN_WORDS <= 0 or len(text.split()) >= RSS_FULLTEXT_MIN_WORDS):
            a["scraped_content"] = text
            adopted += 1
    if adopted:
        log.info("RSS full-text: populated scraped_content for %d/%d new articles", adopted, len(articles))
    return adopted


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
        existing_urls = storage.list_article_links()

        new_articles, results, stats = run_all(
            existing_urls=existing_urls,
            max_age_hours=max_age_hours,
            max_articles=max_new,
        )
        stats["rss_fulltext_count"] = _adopt_rss_fulltext(new_articles)
        now = datetime.now(timezone.utc).isoformat()
        storage.save_raw_articles(new_articles, last_updated=now)

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


def _is_minimax_sensitive_error(exc: BaseException) -> bool:
    message = str(exc).lower()
    return "new_sensitive" in message or "output new_sensitive" in message


# LLM statuses that mean "the account/key is the problem", not the article:
# 401 bad key, 402 insufficient balance, 403 forbidden.
_LLM_ACCOUNT_STATUSES = {401, 402, 403}


def _is_minimax_account_error(exc: BaseException) -> bool:
    """True for provider-side failures that would hit every article alike.

    Covers account errors and rate limits that survived the wrapper's own retries
    (on OpenRouter's free tier that usually means the daily quota is used up).
    """
    if isinstance(exc, MiniMaxRateLimitError):
        return True
    return isinstance(exc, MiniMaxHTTPError) and exc.status_code in _LLM_ACCOUNT_STATUSES


def _keep_scraped_body(article: dict, scraped_content: str) -> None:
    """Persist a body scraped this cycle when the LLM step failed, so the retry reuses it."""
    if scraped_content and not article.get("scraped_content"):
        storage.update_scraped_content(article["link"], scraped_content)


def _sensitive_error_text(exc: BaseException) -> str:
    return f"MiniMaxSensitiveOutput: {str(exc)[:260]}"


def _apply_scrape_outcome(article: dict, scrape_ok: bool, *, allow_defer: bool = True) -> bool:
    """Stamp scrape_status/scrape_attempts onto `article`; return False to defer the LLM.

    A row that already had a stored body did not scrape this cycle, so its attempt counter
    is left alone. A truncated scrape is deferred (row stays pending, re-scraped next cycle)
    until SCRAPE_MAX_ATTEMPTS is reached; after that the LLM falls back to the RSS summary
    and the row keeps scrape_status='truncated' so the admin UI can spot it.
    """
    scraped_now = not article.get("scraped_content")
    attempts = (article.get("scrape_attempts") or 0) + (1 if scraped_now else 0)
    article["scrape_attempts"] = attempts
    article["scrape_status"] = "ok" if scrape_ok else "truncated"
    if scrape_ok or not allow_defer:
        return True
    return attempts >= SCRAPE_MAX_ATTEMPTS


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
        deferred = 0
        aborted_reason = ""
        llm_called = False
        for article in pending:
            # Pace only between real LLM calls — a deferred scrape never hits MiniMax.
            if llm_called and MINIMAX_RATE_LIMIT_SLEEP_SEC > 0:
                time.sleep(MINIMAX_RATE_LIMIT_SLEEP_SEC)
            llm_called = False
            link = article["link"]
            new_attempts = (article.get("enrichment_attempts") or 0) + 1
            scraped_content = ""
            try:
                text_for_llm, scraped_content, scrape_ok = ensure_scraped_content(article)
                if not _apply_scrape_outcome(article, scrape_ok):
                    log.info(
                        "Scrape truncated for '%s' (attempt %d/%d); deferring LLM to re-scrape",
                        link, article["scrape_attempts"], SCRAPE_MAX_ATTEMPTS,
                    )
                    storage.mark_scrape_deferred(link, article["scrape_attempts"])
                    deferred += 1
                    continue
                llm_called = True
                updated = enrich_news_article(article, text_for_llm, scraped_content)
                updated["content_hash"] = compute_content_hash(updated.get("scraped_content", ""))
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
                _keep_scraped_body(article, scraped_content)
                if _is_minimax_account_error(exc):
                    # Bad key / no balance fails every article the same way: stop the
                    # cycle and leave attempts untouched so rows survive until it's fixed.
                    log.error(
                        "LLM account/rate-limit error during enrichment, aborting cycle: %s", exc
                    )
                    storage.mark_enrichment_status(
                        link, "pending", increment_attempts=False,
                        error=f"{type(exc).__name__}: {str(exc)[:300]}",
                    )
                    aborted_reason = "account"
                    break
                if _is_minimax_sensitive_error(exc):
                    log.warning(
                        "MiniMax sensitive output for '%s'; marking failed permanently: %s",
                        link, exc,
                    )
                    storage.mark_enrichment_status(
                        link,
                        "failed",
                        increment_attempts=True,
                        error=_sensitive_error_text(exc),
                    )
                    continue
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

        # Bound trafilatura's cache growth across this on-demand-scraping cycle.
        reset_scrape_caches()

        if enriched:
            now = datetime.now(timezone.utc).isoformat()
            storage.save_news({"last_updated": now, "articles": enriched})
            log.info("Stage B enriched %d articles (%d marked done)", len(enriched), done)
            # Track B — group same-story articles across sources (needs bodies → post-enrich).
            try:
                regroup_recent_stories()
            except Exception:  # noqa: BLE001 — grouping must never break enrichment
                log.exception("Story regrouping failed (non-fatal)")

        result = {"retried_count": len(enriched), "done_count": done, "scrape_deferred_count": deferred}
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


def regroup_recent_stories(days: int = 2) -> dict:
    """Track B — group same-story articles across sources over the recent window.

    Idempotent: recomputes groups for the last `days` days each call, reusing existing
    group ids (stable across runs) and clearing groups for rows that no longer match.
    Run after Stage B since confirmation needs article bodies. Returns a small summary.
    """
    window = storage.list_recent_articles_for_dedup(days=days)
    if not window:
        return {"window": 0, "grouped": 0, "groups": 0, "cleared": 0}

    assignments = group_articles(window)
    assigned_links = {a["link"] for a in assignments}
    group_ids = {a["story_group_id"] for a in assignments}
    # Clear stale groups: window rows previously grouped but no longer in any group.
    cleared = [
        {"link": w["link"], "story_group_id": "", "story_group_size": 0, "is_group_primary": 0}
        for w in window
        if (w.get("story_group_id") or "") and w["link"] not in assigned_links
    ]
    storage.assign_story_groups(assignments + cleared)
    log.info(
        "Story grouping: window=%d grouped=%d into %d groups, cleared=%d",
        len(window), len(assigned_links), len(group_ids), len(cleared),
    )
    return {
        "window": len(window),
        "grouped": len(assigned_links),
        "groups": len(group_ids),
        "cleared": len(cleared),
    }


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


def _prepare_batch_enrichment_articles(pending: list[dict]) -> list[dict]:
    """Scrape article bodies before compact batch LLM enrichment.

    The automatic batch path used to send only RSS title/summary, which made
    many `content_zh` rows look like title-only summaries. Keep the full scrape
    in `scraped_content` for storage, and pass the trimmed LLM input through a
    private key that the prompt builder understands but storage ignores.
    """
    prepared = []
    for article in pending:
        text_for_llm, scraped_content, scrape_ok = ensure_scraped_content(article)
        updated = {**article, "_llm_content": text_for_llm}
        # Manual batch button: never defer, but still record the scrape outcome.
        _apply_scrape_outcome(updated, scrape_ok, allow_defer=False)
        if scraped_content:
            updated["scraped_content"] = scraped_content
            if not article.get("scraped_content"):
                storage.update_scraped_content(article["link"], scraped_content)
        prepared.append(updated)
    return prepared


def _run_batch_enrichment(
    pending: list[dict],
    *,
    log_event: str,
    start_label: str,
    success_label: str,
    failure_label: str,
    config_error_label: str,
    sensitive_label: str,
    auto: bool = False,
) -> dict:
    if not pending:
        return {"selected_count": 0, "done_count": 0, "failed_count": 0}

    pending = _prepare_batch_enrichment_articles(pending)

    storage.add_log(
        log_event,
        f"{start_label}: 选择{len(pending)}条",
        {"selected_count": len(pending), "auto": auto},
    )

    enriched = []
    matched_indexes = set()
    invalid_rows = 0
    row_count = 0
    extra_rows = 0
    aborted_reason = ""

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
        if _is_minimax_account_error(exc):
            # Not the articles' fault — don't burn their attempts.
            result = {
                "selected_count": len(pending),
                "done_count": 0,
                "failed_count": 0,
                "aborted": "account",
                "error_type": type(exc).__name__,
                "error": str(exc)[:300],
                "auto": auto,
            }
            storage.add_log(log_event, f"{failure_label}: LLM 账户错误或限流，已中止", result)
            return result
        if _is_minimax_sensitive_error(exc) and len(pending) == 1:
            storage.mark_enrichment_status(
                pending[0]["link"],
                "failed",
                increment_attempts=True,
                error=_sensitive_error_text(exc),
            )
            result = {
                "selected_count": len(pending),
                "done_count": 0,
                "failed_count": 1,
                "invalid_rows": 0,
                "row_count": 0,
                "extra_rows": 0,
                "missing_count": 1,
                "error_type": type(exc).__name__,
                "error": str(exc)[:300],
                "permanent_failed": 1,
                "auto": auto,
            }
            storage.add_log(log_event, sensitive_label, result)
            return result
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
            "auto": auto,
        }
        storage.add_log(log_event, failure_label, result)
        return result

    if aborted_reason:
        result = {
            "selected_count": len(pending),
            "done_count": 0,
            "failed_count": 0,
            "aborted": aborted_reason,
            "auto": auto,
        }
        storage.add_log(log_event, config_error_label, result)
        return result

    for updated in enriched:
        new_attempts = (updated.get("enrichment_attempts") or 0) + 1
        updated["enrichment_status"] = "done"
        updated["enrichment_attempts"] = new_attempts
        updated["enrichment_error"] = ""
        updated["content_hash"] = compute_content_hash(updated.get("scraped_content", ""))

    if enriched:
        now = datetime.now(timezone.utc).isoformat()
        storage.save_news({"last_updated": now, "articles": enriched})
        log.info("Batch enriched %d articles", len(enriched))
        # Track B — group same-story articles across sources (needs bodies → post-enrich).
        try:
            regroup_recent_stories()
        except Exception:  # noqa: BLE001 — grouping must never break enrichment
            log.exception("Story regrouping failed (non-fatal)")

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
        "auto": auto,
    }
    storage.add_log(
        log_event,
        f"{success_label}: 选择{result['selected_count']}条, 成功{result['done_count']}条",
        result,
    )
    return result


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
        return _run_batch_enrichment(
            pending,
            log_event="news_llm_batch",
            start_label="批量LLM开始",
            success_label="批量LLM完成",
            failure_label="批量LLM失败",
            config_error_label="批量LLM配置错误，已中止",
            sensitive_label="批量LLM敏感内容失败，已永久跳过",
        )
    finally:
        _enrich_lock.release()


def auto_batch_enrich_missing_content_news(limit: int = 20) -> dict:
    """Run automatic batch LLM only for articles missing Chinese content."""
    limit = max(1, min(int(limit or 20), 20))
    if not _enrich_lock.acquire(blocking=False):
        return {
            "status": "already_running",
            "selected_count": 0,
            "done_count": 0,
            "failed_count": 0,
        }
    try:
        pending = storage.list_pending_enrichment_missing_content(limit=limit)
        return _run_batch_enrichment(
            pending,
            log_event="news_llm_auto_batch",
            start_label="自动批量LLM开始",
            success_label="自动批量LLM完成",
            failure_label="自动批量LLM失败",
            config_error_label="自动批量LLM配置错误，已中止",
            sensitive_label="自动批量LLM敏感内容失败，已永久跳过",
            auto=True,
        )
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
