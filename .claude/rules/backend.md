---
paths:
  - "backend/**/*.py"
  - "main.py"
  - "requirements.txt"
---

# Backend Rules

## File Responsibilities

- **`api.py`** — thin FastAPI REST endpoints (HTTP only: parsing, status codes, responses)
- **`services.py`** — orchestration: coordinates fetching, processing, storage; no FastAPI imports. Splits news into `collect_news` (Stage A) and `enrich_pending_news` (Stage B); `fetch_and_save_news` runs both inline for the legacy endpoint.
- **`crawler/`** — RSS fetching only, per-source adapters under `crawler/adapters/`. Tracks per-source health in the `source_health` table. **No LLM calls.**
  - `crawler/base.py` — `BaseAdapter` ABC + `RawArticle` + `FetchResult` (retry, timing)
  - `crawler/parsing.py` — shared helpers: `classify`, `deduplicate`, `parse_date`, image extraction
  - `crawler/runner.py` — `CrawlerRunner` parallelizes adapters, writes `source_health`
  - `crawler/adapters/*.py` — one module per source; overrides only what that feed needs (RTP image, Público date, TVI24 date)
- **`news.py`** — LLM enrichment only: `scrape_article` (trafilatura), `_enrich_article`, `re_enrich_article`. Re-exports `classify` for back-compat.
- **`llm.py`** — single `call_minimax(prompt, max_tokens, fallback)` wrapper for MiniMax API
- **`prompts.py`** — all LLM prompt templates (see llm-prompts rule for contract details)
- **`database.py`** — SQLite schema init, connection manager, column migrations
- **`config.py`** — constants (DB_PATH, API URLs, feature flags)
- **`sources.py`** — `RSS_SOURCES` URLs, `SOURCE_PRIORITY` for dedup, category keyword lists, `CN_TAG_KEYWORDS`
- **`storage/`** — SQLite CRUD split by domain: `base.py`, `news.py`, `health.py`, `ideas.py`, `listings.py`, `users.py`, `migration.py`

## DB Schema — articles table

```
link (PK), title, summary, source, category, published,
scraped_content, ai_summary, title_zh, content_zh, tags_zh,
view_count,
author, image_url, language, guid, rss_category, fetched_at,
enrichment_status, enrichment_attempts
```

- `category` — Portuguese keyword-matched topic (Politica, Desporto, etc.)
- `tags_zh` — comma-separated Chinese-interest tags from LLM (or empty)
- `title_zh` / `content_zh` — Chinese translation from LLM
- `image_url`, `author`, `guid`, `rss_category` — captured from RSS by adapters
- `enrichment_status` — `pending` (just collected) | `done` (LLM filled title_zh/content_zh) | `failed`
- `enrichment_attempts` — incremented each Stage B run; lets us cap retries on hopeless rows

## DB Schema — source_health table

One row per source. Updated each `collect_news()` cycle by `crawler/runner.py`.

```
source (PK), last_fetched_at, last_status, last_error, last_duration_ms,
entries_count, articles_count, consecutive_failures, total_fetches
```

- `last_status` — `ok` | `http_error` | `parse_error` | `empty`
- `consecutive_failures` — resets on `ok`; `empty` is non-fatal and does NOT bump it
- Surface via `GET /api/admin/sources/health`

## Storage Patterns

- All CRUD uses `INSERT ... ON CONFLICT DO UPDATE` (upsert by primary key)
- `_trim_articles()` keeps DB at MAX_ARTICLES (2000)
- `_migrate()` adds new columns safely with try/except on ALTER TABLE
- `load_*()` returns `{"last_updated": str, "articles": [dict]}`
- Indexes created after `_migrate()` if they reference migrated columns

## Fetch Flow

**Stage A — collect** (fast, ~ a few hundred ms per adapter):
1. `CrawlerRunner.run()` calls each adapter's `fetch()` in parallel (9 workers)
2. Each adapter does HTTP GET (15s timeout, 2 retries with 1s/3s backoff), parses with `feedparser`, returns `FetchResult`
3. Runner aggregates, filters out `existing_urls`, dedupes by fuzzy title+date, filters by `max_age_hours`, writes `source_health`
4. `storage.save_raw_articles()` upserts the new articles with `enrichment_status='pending'`

**Stage B — enrich** (slow, MiniMax rate-limited):
1. `storage.list_pending_enrichment(limit)` finds rows still missing `title_zh`/`content_zh`/`tags_zh`
2. For each: `re_enrich_article()` scrapes (if needed) and calls MiniMax
3. `storage.mark_enrichment_status(link, 'done'|'pending'|'failed')` updates per-row state

`fetch_and_save_news()` runs A then B inline (legacy `/api/news/fetch` behavior). `/api/news/enrich` runs B only (cron-safe, idempotent).

## Adding a New Source

1. Add URL + name to `backend/sources.py` `RSS_SOURCES` and `SOURCE_PRIORITY`
2. Create `backend/crawler/adapters/<source>.py` subclassing `BaseAdapter`; set `name`, `url`, override extractors only if the feed has quirks
3. Register the class in `backend/crawler/adapters/__init__.py`'s `ADAPTER_CLASSES` list
