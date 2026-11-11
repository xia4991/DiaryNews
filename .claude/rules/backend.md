---
paths:
  - "backend/**/*.py"
  - "main.py"
  - "requirements.txt"
---

# Backend Rules

## File Responsibilities

- **`api.py`** — thin FastAPI REST endpoints (HTTP only: parsing, status codes, responses)
- **`services.py`** — orchestration: coordinates fetching, processing, storage; no FastAPI imports. Splits news into `collect_news` (Stage A) and `enrich_pending_news` (Stage B).
- **`crawler/`** — RSS fetching only, per-source adapters under `crawler/adapters/`. Tracks per-source health in the `source_health` table. **No LLM calls.**
  - `crawler/base.py` — `BaseAdapter` ABC + `RawArticle` + `FetchResult` (retry, timing)
  - `crawler/parsing.py` — shared helpers: `classify`, `deduplicate`, `parse_date`, image extraction
  - `crawler/runner.py` — `CrawlerRunner` parallelizes adapters, writes `source_health`
  - `crawler/adapters/*.py` — one module per source; overrides only what that feed needs (RTP sub-feeds + image, Público date)
- **`news.py`** — article body scraping only: `scrape_article` (trafilatura), `ensure_scraped_content` (consent-cookie retry + truncation gate), `extract_rss_fulltext`, `compute_content_hash`. Re-exports `classify` for back-compat.
- **`llm/`** — `minimax.py` (`call_minimax` + typed `MiniMax*Error`s), `article_enrichment.py` (`enrich_news_article`, `batch_enrich_news_articles`), `prompts.py` (all templates; see llm-prompts rule)
- **`dedup.py`** — Track B cross-source story grouping (`group_articles`)
- **`database.py`** — SQLite schema init, connection manager, column migrations
- **`config.py`** — constants (DB_PATH, API URLs, feature flags)
- **`sources.py`** — `RSS_SOURCES` URLs, `SOURCE_PRIORITY` for dedup, category keyword lists, `CN_TAG_KEYWORDS`
- **`storage/`** — SQLite CRUD split by domain: `base.py`, `news.py`, `health.py`, `ideas.py`, `listings.py`, `users.py`, `migration.py`

## DB Schema — articles table

```
link (PK), title, summary, source, category, published,
scraped_content, ai_summary,
title_zh, summary_zh, content_zh, tags_zh, relevance_reason,
view_count,
author, image_url, language, guid, rss_category, fetched_at,
enrichment_status, enrichment_attempts, enrichment_error,
enriched_at, enrichment_model, enrichment_prompt_version, enrichment_input_hash,
scrape_status, scrape_attempts,
content_hash, story_group_id, story_group_size, is_group_primary
```

- `summary_zh` — short Chinese summary for card previews (v2 prompt). Distinct from `content_zh` which is the fuller refined body.
- `relevance_reason` — short Chinese explanation of why the article matters to the Chinese-in-Portugal audience; empty when not relevant.

- `category` — Portuguese keyword-matched topic (Politica, Desporto, etc.)
- `tags_zh` — comma-separated Chinese-interest tags from LLM (or empty)
- `title_zh` / `content_zh` — Chinese translation from LLM
- `image_url`, `author`, `guid`, `rss_category` — captured from RSS by adapters
- `enrichment_status` — `pending` | `done` (`title_zh` + `content_zh` non-empty) | `failed` (terminal). Content is the source of truth — `repair_enrichment_status()` reconciles stale state. `list_pending_enrichment()` gates on content completeness + retry ceiling, not status alone.
- `enrichment_attempts` — incremented each Stage B run; capped by `MAX_ENRICHMENT_ATTEMPTS` (env, default 3). At the ceiling the row auto-transitions to `failed`.
- `enrichment_error` — last failure reason; cleared on `done`. Surfaced by `/api/admin/news/recent`.
- `scrape_status` (`'' | ok | truncated`) / `scrape_attempts` — on-demand body scrape outcome. In `enrich_pending_news`, a truncated scrape with `scrape_attempts < SCRAPE_MAX_ATTEMPTS` (env, default 2) skips the LLM and stays pending for a re-scrape next cycle; at the ceiling the LLM falls back to the RSS summary and the row keeps `truncated`. The manual batch path records the status but never defers.
- `enriched_at`, `enrichment_model`, `enrichment_prompt_version`, `enrichment_input_hash` — observability columns written by Stage B once Article Enrichment V2 (Feature 2 of the MiniMax optimization plan) lands.

### Upsert preserve-on-empty

`_bulk_upsert_articles()` uses `COALESCE(NULLIF(excluded.col, ''), col)` for
`scraped_content`, `ai_summary`, `title_zh`, `content_zh`, `tags_zh`, and the
four enrichment metadata columns above. A Stage A re-fetch of an already-
enriched article therefore cannot blank out its Chinese content; only Stage B
(which passes real values) overwrites them. `enrichment_attempts` is preserved
via `MAX(old, new)` so the retry counter is monotonic.

## DB Schema — source_health table

One row per source. Updated each `collect_news()` cycle by `crawler/runner.py`.

```
source (PK), last_fetched_at, last_status, last_error, last_duration_ms,
entries_count, articles_count, consecutive_failures, total_fetches
```

- `last_status` — `ok` | `partial_ok` | `empty` | `http_error` | `parse_error`
- `partial_ok` — adapter aggregated multiple sub-fetches and at least one failed but at least one succeeded (e.g. RTP's 5 section feeds). Non-fatal: preserves `consecutive_failures` but writes a `last_error` annotation like `2/5 sub-feeds failed: ...`
- `consecutive_failures` — resets on `ok`; `empty` and `partial_ok` preserve it (do not bump)
- Surface via `GET /api/admin/sources/health`

## Storage Patterns

- All CRUD uses `INSERT ... ON CONFLICT DO UPDATE` (upsert by primary key)
- `_trim_articles()` trims to `MAX_STORED_ARTICLES` (env, default 0 = never delete); `NEWS_FEED_LIMIT` (default 3000) only bounds the `/api/news` payload
- `_migrate()` adds new columns safely with try/except on ALTER TABLE
- `load_*()` returns `{"last_updated": str, "articles": [dict]}`
- Indexes created after `_migrate()` if they reference migrated columns

## Fetch Flow

**Stage A — collect** (fast, ~ a few hundred ms per adapter):
1. `CrawlerRunner.run()` calls each adapter's `fetch()` in parallel (8 registered adapters)
2. Each adapter does HTTP GET (15s timeout, 2 retries with 1s/3s backoff), parses with `feedparser`, returns `FetchResult`
3. Runner aggregates, filters out `existing_urls`, dedupes by fuzzy title+date, filters by `max_age_hours`, drops articles whose RSS summary has fewer than `MIN_SUMMARY_WORDS` tokens (env, default 0 = disabled), writes `source_health`
4. `storage.save_raw_articles()` upserts the new articles with `enrichment_status='pending'`
5. Returns `(articles, results, stats)` where `stats = {raw_count, existing_skipped, dedupe_skipped, age_skipped, short_skipped, cap_skipped, returned_count}` — surfaces *why* a cycle returned fewer articles

**Stage B — enrich** (slow, MiniMax rate-limited):
1. `storage.list_pending_enrichment(limit, max_attempts=MAX_ENRICHMENT_ATTEMPTS)` finds rows still missing `title_zh`/`content_zh`/`tags_zh` whose status is neither `done` nor `failed` and whose `enrichment_attempts < max_attempts`
2. `ensure_scraped_content()` scrapes on demand if `scraped_content` is empty (RSS `summary` as fallback), then `enrich_news_article()` calls MiniMax
3. Success / missing-field outcomes both write final `enrichment_status` + `enrichment_attempts` + `enrichment_error` into the row dict and persist via a single `storage.save_news()` (one upsert, no clobber). If `attempts` reaches `MAX_ENRICHMENT_ATTEMPTS` while still missing fields, status auto-transitions to `failed`.
4. Exception path uses `storage.mark_enrichment_status(...)` directly. MiniMax config errors and account errors (HTTP 401/402/403, e.g. insufficient balance) abort the cycle **without** incrementing attempts; a body scraped before a failed LLM call is still persisted

Background loops in `api.py` run A every `NEWS_FETCH_INTERVAL` and B every `NEWS_AUTO_BATCH_LLM_INTERVAL`. `/api/news/enrich` runs B only (cron-safe, idempotent). Both `collect_news` and `enrich_pending_news` hold module-level `threading.Lock`s (`_collect_lock`, `_enrich_lock`); a non-blocking acquire failure returns `{"status": "already_running", ...}` which the api layer maps to HTTP 409.

## Crawler / News Endpoints

| Method | Path | Behavior |
|---|---|---|
| POST | `/api/news/collect` | Admin. Stage A only — returns `{new_count, sources, stats, last_updated}`. 409 if a collect is already running. |
| POST | `/api/news/enrich?max_retry=N` | Admin. Stage B only, idempotent — returns `{retried_count, done_count}`. 409 if an enrich is already running. |
| POST | `/api/news/enrich/batch?limit=N` | Admin. One compact LLM call for up to 20 pending articles. |
| GET | `/api/admin/sources/health` | Admin. `{sources: [...source_health rows...], stats: get_article_stats()}` |
| GET | `/api/admin/news/recent?status=&limit=` | Admin. Recent articles with optional `enrichment_status` filter. Each row includes `enrichment_error`. |

## Adding a New Source

1. Add URL + name to `backend/sources.py` `RSS_SOURCES` and `SOURCE_PRIORITY`
2. Create `backend/crawler/adapters/<source>.py` subclassing `BaseAdapter`; set `name`, `url`, override extractors only if the feed has quirks
3. Register the class in `backend/crawler/adapters/__init__.py`'s `ADAPTER_CLASSES` list
