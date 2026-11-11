from typing import Optional
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from backend.config import MAX_STORED_ARTICLES, MAX_ENRICHMENT_ATTEMPTS, NEWS_FEED_LIMIT
from backend.storage.database import get_db
from backend.storage.base import _ensure_db, _get_meta, _set_meta

PORTUGAL_TZ = ZoneInfo("Europe/Lisbon")


def load_news() -> dict:
    _ensure_db()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM articles ORDER BY published DESC LIMIT ?", (NEWS_FEED_LIMIT,)
        ).fetchall()
    return {
        "last_updated": _get_meta("news_last_updated"),
        "articles": [dict(r) for r in rows],
    }


def list_article_links() -> set:
    """Every stored article link — Stage A's existing-URL set.

    Link-only on purpose: load_news() pulls whole rows (bodies included) and stops at
    NEWS_FEED_LIMIT, which is both heavier and incomplete for this check.
    """
    _ensure_db()
    with get_db() as conn:
        return {r["link"] for r in conn.execute("SELECT link FROM articles")}


def _collapse_story_groups(articles: list) -> list:
    """Collapse cross-source story groups to one representative card + an 'N sources' badge.

    Input is the feed window ordered by published DESC. Each group is emitted once, at the
    position of its most-recently-published member (so actively-covered stories stay near
    the top), but the card content is the group's representative — the earliest-published
    member (the rule chosen for Track B). Ungrouped articles pass through unchanged.
    Adds `story_group_size` (members in this window) and `story_group_sources` (distinct
    source names) so the frontend can render the badge; if it ignores them, it still shows
    one card per story.
    """
    members: dict[str, list] = {}
    for a in articles:
        gid = a.get("story_group_id") or ""
        if gid:
            members.setdefault(gid, []).append(a)

    out: list = []
    emitted: set = set()
    for a in articles:
        gid = a.get("story_group_id") or ""
        if not gid:
            out.append(a)
            continue
        if gid in emitted:
            continue
        emitted.add(gid)
        group = members[gid]
        rep = min(group, key=lambda m: (m.get("published") or ""))
        card = dict(rep)
        card["story_group_size"] = len(group)
        card["story_group_sources"] = sorted({m.get("source") or "" for m in group if m.get("source")})
        out.append(card)
    return out


def load_news_feed() -> dict:
    """Public feed — like load_news() but collapses cross-source story groups.

    Kept separate from load_news() so other callers (e.g. brief generation) still see
    every article in the window, not just one representative per story group.
    """
    data = load_news()
    return {
        "last_updated": data["last_updated"],
        "articles": _collapse_story_groups(data["articles"]),
    }


def get_article_stats() -> dict:
    """Aggregate counts for admin dashboards.

    Returns:
      - total / pending / done / failed counts
      - by_source: per-source totals + status breakdown + with_image / with_author
      - pending_by_source: just the pending counts ordered desc (admin needs to
        know which sources have the biggest enrichment backlog)
      - failures_by_error: top error reasons (truncated to first 80 chars so
        rate-limit body text doesn't dominate)
      - scraped_no_chinese: rows that have a scraped body but no title_zh — a
        useful signal that scraping is working but enrichment isn't
    """
    _ensure_db()
    with get_db() as conn:
        total_row = conn.execute("SELECT COUNT(*) AS c FROM articles").fetchone()
        status_rows = conn.execute(
            "SELECT enrichment_status AS s, COUNT(*) AS c FROM articles GROUP BY enrichment_status"
        ).fetchall()
        source_rows = conn.execute(
            """SELECT
                 source,
                 COUNT(*) AS total,
                 SUM(CASE WHEN enrichment_status = 'done'    THEN 1 ELSE 0 END) AS done,
                 SUM(CASE WHEN enrichment_status = 'pending' THEN 1 ELSE 0 END) AS pending,
                 SUM(CASE WHEN enrichment_status = 'failed'  THEN 1 ELSE 0 END) AS failed,
                 SUM(CASE WHEN COALESCE(image_url,'') != ''  THEN 1 ELSE 0 END) AS with_image,
                 SUM(CASE WHEN COALESCE(author,'')    != ''  THEN 1 ELSE 0 END) AS with_author,
                 MAX(fetched_at) AS last_fetched_at
               FROM articles
               WHERE source IS NOT NULL AND source != ''
               GROUP BY source
               ORDER BY source ASC"""
        ).fetchall()
        pending_by_source_rows = conn.execute(
            """SELECT source, COUNT(*) AS c FROM articles
               WHERE enrichment_status = 'pending'
                 AND source IS NOT NULL AND source != ''
               GROUP BY source
               ORDER BY c DESC, source ASC"""
        ).fetchall()
        failure_rows = conn.execute(
            """SELECT SUBSTR(COALESCE(enrichment_error, ''), 1, 80) AS reason,
                      COUNT(*) AS c
               FROM articles
               WHERE enrichment_status = 'failed'
                 AND COALESCE(enrichment_error, '') != ''
               GROUP BY reason
               ORDER BY c DESC
               LIMIT 10"""
        ).fetchall()
        scraped_no_zh_row = conn.execute(
            """SELECT COUNT(*) AS c FROM articles
               WHERE COALESCE(scraped_content, '') != ''
                 AND COALESCE(title_zh, '') = ''"""
        ).fetchone()

    by_status = {r["s"] or "unknown": r["c"] for r in status_rows}
    return {
        "total": total_row["c"] if total_row else 0,
        "pending": by_status.get("pending", 0),
        "done": by_status.get("done", 0),
        "failed": by_status.get("failed", 0),
        "by_source": [dict(r) for r in source_rows],
        "pending_by_source": [dict(r) for r in pending_by_source_rows],
        "failures_by_error": [dict(r) for r in failure_rows],
        "scraped_no_chinese": scraped_no_zh_row["c"] if scraped_no_zh_row else 0,
    }


def get_today_article_stats(reference_dt: Optional[datetime] = None) -> dict:
    """Aggregate today's crawler/LLM counts by Europe/Lisbon fetched_at day."""
    current = reference_dt or datetime.now(PORTUGAL_TZ)
    if current.tzinfo is None:
        current = current.replace(tzinfo=PORTUGAL_TZ)
    local_day = current.astimezone(PORTUGAL_TZ).date()
    start_local = datetime.combine(local_day, time.min, tzinfo=PORTUGAL_TZ)
    end_local = datetime.combine(local_day, time.max, tzinfo=PORTUGAL_TZ)
    start_utc = start_local.astimezone(timezone.utc)
    end_utc = end_local.astimezone(timezone.utc)
    start_iso = start_utc.isoformat()
    end_iso = end_utc.isoformat()

    _ensure_db()
    with get_db() as conn:
        known_source_rows = conn.execute(
            """SELECT source FROM source_health
               WHERE source IS NOT NULL AND source != ''
               UNION
               SELECT DISTINCT source FROM articles
               WHERE source IS NOT NULL AND source != ''
               ORDER BY source ASC"""
        ).fetchall()
        today_rows = conn.execute(
            """SELECT
                 source,
                 COUNT(*) AS fetched,
                 SUM(CASE WHEN enrichment_status = 'done' THEN 1 ELSE 0 END) AS llm_done,
                 SUM(CASE WHEN enrichment_status = 'pending' THEN 1 ELSE 0 END) AS pending,
                 SUM(CASE WHEN enrichment_status = 'failed' THEN 1 ELSE 0 END) AS failed
               FROM articles
               WHERE COALESCE(fetched_at, '') >= ?
                 AND COALESCE(fetched_at, '') <= ?
                 AND source IS NOT NULL
                 AND source != ''
               GROUP BY source""",
            (start_iso, end_iso),
        ).fetchall()

    today_by_source = {row["source"]: dict(row) for row in today_rows}
    sources = [row["source"] for row in known_source_rows]
    for source in today_by_source:
        if source not in sources:
            sources.append(source)
    sources.sort()

    by_source = []
    total = {"fetched": 0, "llm_done": 0, "pending": 0, "failed": 0}
    for source in sources:
        row = today_by_source.get(source, {})
        fetched = int(row.get("fetched") or 0)
        llm_done = int(row.get("llm_done") or 0)
        pending = int(row.get("pending") or 0)
        failed = int(row.get("failed") or 0)
        total["fetched"] += fetched
        total["llm_done"] += llm_done
        total["pending"] += pending
        total["failed"] += failed
        by_source.append({
            "source": source,
            "fetched": fetched,
            "llm_done": llm_done,
            "pending": pending,
            "failed": failed,
            "success_rate": round((llm_done / fetched) * 100, 1) if fetched else 0,
        })

    return {
        "date": local_day.isoformat(),
        "timezone": "Europe/Lisbon",
        "range_utc": {"start": start_iso, "end": end_iso},
        "total": total,
        "by_source": by_source,
    }


def save_news(data: dict) -> None:
    _ensure_db()
    _bulk_upsert_articles(data.get("articles", []))
    last = data.get("last_updated")
    if last:
        _set_meta("news_last_updated", last)
    _trim_articles()


def _bulk_upsert_articles(articles: list) -> None:
    # Preserve-on-empty (NULLIF) protects enriched content from being clobbered when
    # Stage A re-fetches an already-enriched article. Stage B passes the real values
    # so its writes take effect normally; Stage A's empty defaults fall through to
    # the existing row. enrichment_attempts uses MAX so the retry counter is monotonic.
    with get_db() as conn:
        conn.executemany(
            """INSERT INTO articles
               (link, title, summary, source, category, published, scraped_content, ai_summary,
                title_zh, summary_zh, content_zh, tags_zh, relevance_reason,
                author, image_url, language, guid, rss_category, fetched_at,
                enrichment_status, enrichment_attempts, enrichment_error,
                enriched_at, enrichment_model, enrichment_prompt_version, enrichment_input_hash,
                content_hash, scrape_status, scrape_attempts)
               VALUES (:link,:title,:summary,:source,:category,:published,:scraped_content,:ai_summary,
                :title_zh,:summary_zh,:content_zh,:tags_zh,:relevance_reason,
                :author,:image_url,:language,:guid,:rss_category,:fetched_at,
                :enrichment_status,:enrichment_attempts,:enrichment_error,
                :enriched_at,:enrichment_model,:enrichment_prompt_version,:enrichment_input_hash,
                :content_hash, :scrape_status, :scrape_attempts)
               ON CONFLICT(link) DO UPDATE SET
                 title = excluded.title,
                 summary = excluded.summary,
                 source = excluded.source,
                 category = excluded.category,
                 published = excluded.published,
                 scraped_content = COALESCE(NULLIF(excluded.scraped_content, ''), scraped_content),
                 ai_summary = COALESCE(NULLIF(excluded.ai_summary, ''), ai_summary),
                 title_zh = COALESCE(NULLIF(excluded.title_zh, ''), title_zh),
                 summary_zh = COALESCE(NULLIF(excluded.summary_zh, ''), summary_zh),
                 content_zh = COALESCE(NULLIF(excluded.content_zh, ''), content_zh),
                 tags_zh = COALESCE(NULLIF(excluded.tags_zh, ''), tags_zh),
                 relevance_reason = COALESCE(NULLIF(excluded.relevance_reason, ''), relevance_reason),
                 author = excluded.author,
                 image_url = excluded.image_url,
                 language = excluded.language,
                 guid = excluded.guid,
                 rss_category = excluded.rss_category,
                 fetched_at = excluded.fetched_at,
                 enrichment_status = excluded.enrichment_status,
                 enrichment_attempts = MAX(
                   COALESCE(enrichment_attempts, 0),
                   COALESCE(excluded.enrichment_attempts, 0)
                 ),
                 enrichment_error = excluded.enrichment_error,
                 enriched_at = COALESCE(NULLIF(excluded.enriched_at, ''), enriched_at),
                 enrichment_model = COALESCE(NULLIF(excluded.enrichment_model, ''), enrichment_model),
                 enrichment_prompt_version = COALESCE(NULLIF(excluded.enrichment_prompt_version, ''), enrichment_prompt_version),
                 enrichment_input_hash = COALESCE(NULLIF(excluded.enrichment_input_hash, ''), enrichment_input_hash),
                 content_hash = COALESCE(NULLIF(excluded.content_hash, ''), content_hash),
                 scrape_status = COALESCE(NULLIF(excluded.scrape_status, ''), scrape_status),
                 scrape_attempts = MAX(
                   COALESCE(scrape_attempts, 0),
                   COALESCE(excluded.scrape_attempts, 0)
                 )""",
            [
                {
                    "link":                a.get("link", ""),
                    "title":               a.get("title", ""),
                    "summary":             a.get("summary", ""),
                    "source":              a.get("source", ""),
                    "category":            a.get("category", ""),
                    "published":           a.get("published", ""),
                    "scraped_content":     a.get("scraped_content", ""),
                    "ai_summary":          a.get("ai_summary", ""),
                    "title_zh":            a.get("title_zh", ""),
                    "summary_zh":          a.get("summary_zh", ""),
                    "content_zh":          a.get("content_zh", ""),
                    "tags_zh":             a.get("tags_zh", ""),
                    "relevance_reason":    a.get("relevance_reason", ""),
                    "author":              a.get("author", ""),
                    "image_url":           a.get("image_url", ""),
                    "language":            a.get("language", "pt"),
                    "guid":                a.get("guid", ""),
                    "rss_category":        a.get("rss_category", ""),
                    "fetched_at":          a.get("fetched_at", ""),
                    "enrichment_status":   a.get("enrichment_status", "pending"),
                    "enrichment_attempts": a.get("enrichment_attempts", 0),
                    "enrichment_error":    a.get("enrichment_error", ""),
                    "enriched_at":               a.get("enriched_at", ""),
                    "enrichment_model":          a.get("enrichment_model", ""),
                    "enrichment_prompt_version": a.get("enrichment_prompt_version", ""),
                    "enrichment_input_hash":     a.get("enrichment_input_hash", ""),
                    "content_hash":              a.get("content_hash", ""),
                    "scrape_status":             a.get("scrape_status", ""),
                    "scrape_attempts":           a.get("scrape_attempts", 0),
                }
                for a in articles
            ],
        )


def save_raw_articles(articles: list, last_updated: str) -> None:
    """Stage A — persist freshly-crawled raw articles as enrichment_status='pending'.

    Public alias around _bulk_upsert_articles + last_updated meta + trim.
    """
    _ensure_db()
    for a in articles:
        a.setdefault("enrichment_status", "pending")
    _bulk_upsert_articles(articles)
    if last_updated:
        _set_meta("news_last_updated", last_updated)
    _trim_articles()


def list_recent_articles_for_dedup(days: int = 2) -> list:
    """Recent articles for the cross-cycle dedup window (Track B).

    Returns the fields the grouping pass needs to compare a freshly-collected article
    against ones already stored in the last `days` days — so duplicates from slow or
    late-publishing sources are caught across collection cycles, not just within a run.
    """
    _ensure_db()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT link, title, source, published, story_group_id, content_hash, "
            "scraped_content, summary "
            "FROM articles WHERE published >= ? ORDER BY published DESC",
            (cutoff,),
        ).fetchall()
    return [dict(r) for r in rows]


def assign_story_groups(assignments: list) -> int:
    """Write story_group_id/size/primary for the cross-source grouping pass (Track B).

    Each assignment is {link, story_group_id, story_group_size, is_group_primary}.
    Touches only the grouping columns — never enriched content — so it is safe to run
    repeatedly after enrichment. Returns the number of rows updated.
    """
    if not assignments:
        return 0
    _ensure_db()
    with get_db() as conn:
        conn.executemany(
            "UPDATE articles SET "
            "story_group_id = :story_group_id, "
            "story_group_size = :story_group_size, "
            "is_group_primary = :is_group_primary "
            "WHERE link = :link",
            assignments,
        )
    return len(assignments)


def list_recent_articles(limit: int = 20, status: Optional[str] = None) -> list:
    """Recent articles for admin inspection. Optional enrichment_status filter.

    Returns enrichment metadata + content-length signals so the admin UI can
    distinguish 'scraped but not translated' from 'never scraped' without
    shipping the full bodies over the wire.
    """
    _ensure_db()
    with get_db() as conn:
        sql = (
            "SELECT link, title, source, category, published, fetched_at, "
            "image_url, author, rss_category, summary, scraped_content, content_zh, view_count, "
            "enrichment_status, enrichment_attempts, enrichment_error, "
            "enriched_at, enrichment_model, enrichment_prompt_version, "
            "title_zh, summary_zh, tags_zh, relevance_reason, "
            "scrape_status, scrape_attempts, "
            "LENGTH(COALESCE(summary, '')) AS summary_len, "
            "LENGTH(COALESCE(scraped_content, '')) AS scraped_content_len, "
            "LENGTH(COALESCE(content_zh, '')) AS content_zh_len "
            "FROM articles"
        )
        params: list = []
        if status:
            sql += " WHERE enrichment_status = ?"
            params.append(status)
        sql += " ORDER BY fetched_at DESC, published DESC LIMIT ?"
        params.append(limit)
        rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def list_pending_enrichment(limit: int = 20, max_attempts: int = MAX_ENRICHMENT_ATTEMPTS) -> list:
    """Return articles missing Chinese enrichment that haven't hit the retry ceiling.

    Gates on actual content completeness (title_zh + content_zh) rather than
    status alone, so a stale `pending` row that already has Chinese content is
    never re-enriched. Rows explicitly marked `failed` are excluded; everything
    else with empty title_zh OR content_zh is considered pending.
    """
    _ensure_db()
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM articles
               WHERE enrichment_status != 'failed'
                 AND COALESCE(enrichment_attempts, 0) < ?
                 AND (COALESCE(title_zh, '') = '' OR COALESCE(content_zh, '') = '')
               ORDER BY published DESC
               LIMIT ?""",
            (max_attempts, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def list_pending_enrichment_missing_content(
    limit: int = 20,
    max_attempts: int = MAX_ENRICHMENT_ATTEMPTS,
) -> list:
    """Return pending enrichment rows that still have no Chinese content body."""
    _ensure_db()
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM articles
               WHERE enrichment_status != 'failed'
                 AND COALESCE(enrichment_attempts, 0) < ?
                 AND COALESCE(content_zh, '') = ''
               ORDER BY published DESC
               LIMIT ?""",
            (max_attempts, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def repair_enrichment_status() -> dict:
    """Reconcile enrichment_status with actual stored content. Idempotent.

    - Rows with non-empty title_zh AND content_zh → enrichment_status='done', error cleared.
    - Rows with attempts >= MAX_ENRICHMENT_ATTEMPTS AND incomplete content → 'failed'.
    - Never blanks out existing Chinese content (UPDATE only touches the status fields).

    Returns counts of rows modified per branch.
    """
    _ensure_db()
    with get_db() as conn:
        cur_done = conn.execute(
            """UPDATE articles
               SET enrichment_status = 'done',
                   enrichment_error = ''
               WHERE enrichment_status != 'done'
                 AND COALESCE(title_zh, '') != ''
                 AND COALESCE(content_zh, '') != ''"""
        )
        cur_failed = conn.execute(
            """UPDATE articles
               SET enrichment_status = 'failed'
               WHERE enrichment_status NOT IN ('done', 'failed')
                 AND COALESCE(enrichment_attempts, 0) >= ?
                 AND (COALESCE(title_zh, '') = '' OR COALESCE(content_zh, '') = '')""",
            (MAX_ENRICHMENT_ATTEMPTS,),
        )
    return {"marked_done": cur_done.rowcount, "marked_failed": cur_failed.rowcount}


def mark_enrichment_status(
    link: str,
    status: str,
    increment_attempts: bool = True,
    error: Optional[str] = None,
) -> None:
    """Update enrichment_status for one article. Bumps enrichment_attempts by default.

    If `error` is not None, also writes it to `enrichment_error` (pass "" to clear).
    """
    _ensure_db()
    sets = ["enrichment_status = ?"]
    params: list = [status]
    if increment_attempts:
        sets.append("enrichment_attempts = COALESCE(enrichment_attempts, 0) + 1")
    if error is not None:
        sets.append("enrichment_error = ?")
        params.append(error)
    params.append(link)
    sql = f"UPDATE articles SET {', '.join(sets)} WHERE link = ?"
    with get_db() as conn:
        conn.execute(sql, params)


def mark_scrape_deferred(link: str, scrape_attempts: int) -> None:
    """Record a truncated on-demand scrape and leave the row pending for a re-scrape.

    Touches only the scrape columns — enrichment_status/attempts stay as they are, so a
    deferred scrape never burns an LLM retry.
    """
    _ensure_db()
    with get_db() as conn:
        conn.execute(
            """UPDATE articles
               SET scrape_status = 'truncated',
                   scrape_attempts = MAX(COALESCE(scrape_attempts, 0), ?)
               WHERE link = ?""",
            (scrape_attempts, link),
        )


def update_scraped_content(link: str, scraped_content: str) -> None:
    """Persist a freshly scraped article body without touching enrichment fields."""
    if not scraped_content:
        return
    _ensure_db()
    with get_db() as conn:
        conn.execute(
            """UPDATE articles
               SET scraped_content = ?
               WHERE link = ?
                 AND COALESCE(scraped_content, '') = ''""",
            (scraped_content, link),
        )


def increment_article_view(link: str, increment: bool = True) -> Optional[dict]:
    """Return `{link, view_count}` for an article. When `increment=False`, only reads
    the current count without writing — used by the rate-limit dedup path so a flood
    of repeat views from one client stays out of the SQLite writer queue."""
    _ensure_db()
    with get_db() as conn:
        if increment:
            conn.execute(
                """UPDATE articles
                   SET view_count = COALESCE(view_count, 0) + 1
                   WHERE link = ?""",
                (link,),
            )
        row = conn.execute(
            "SELECT link, view_count FROM articles WHERE link = ?",
            (link,),
        ).fetchone()
    return dict(row) if row else None


def _trim_articles() -> None:
    """Delete oldest articles past MAX_STORED_ARTICLES. No-op when unlimited (0)."""
    if MAX_STORED_ARTICLES <= 0:
        return
    with get_db() as conn:
        conn.execute(
            """DELETE FROM articles WHERE link NOT IN (
                SELECT link FROM articles ORDER BY published DESC LIMIT ?
            )""",
            (MAX_STORED_ARTICLES,),
        )


def merge_articles(existing: list, new_articles: list) -> list:
    seen = {a["link"] for a in existing}
    merged = list(existing)
    for a in new_articles:
        if a["link"] not in seen:
            merged.append(a)
            seen.add(a["link"])
    merged.sort(key=lambda a: a["published"], reverse=True)
    return merged[:NEWS_FEED_LIMIT]
