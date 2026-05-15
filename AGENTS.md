# AGENTS.md

## Commands

```bash
# Backend
source .venv/bin/activate && python main.py

# Frontend (separate terminal)
cd react-frontend && npm run dev -- --host

# Install Python deps
source .venv/bin/activate && pip install -r requirements.txt
```

No linter or test suite is configured.

## Architecture

React SPA frontend (`react-frontend/`) + FastAPI backend (`backend/`), connected via REST API on port 8000.

- **API layer**: `api.py` (thin endpoints) → `services.py` (orchestration) → domain modules
- **Crawler**: `crawler/` package — per-source RSS adapters under `crawler/adapters/`; one module per source with a shared `BaseAdapter`. Tracks per-source health in the `source_health` table.
- **News (LLM)**: `news.py` does only scraping + LLM enrichment (Chinese translation + classification)
- **Storage**: `storage/` package — SQLite CRUD split by domain (`news.py`, `health.py`, `ideas.py`, `listings.py`, etc.)
- **LLM**: `llm.py` wraps MiniMax API; `prompts.py` holds all prompt templates
- **Frontend**: `App.jsx` manages tabs (首页, 华人关注, 葡萄牙新闻, 招聘, Ideas) and state; pages + components render UI

## Data Flow

1. **Stage A — collect**: POST `/api/news/collect` (admin UI button) or legacy `/api/news/fetch` (A+B inline) → `CrawlerRunner` runs all 9 adapters in parallel → dedupe + age filter → save raw articles as `enrichment_status='pending'` → write `source_health` (status one of `ok | partial_ok | empty | http_error | parse_error`)
2. **Stage B — enrich**: `services.enrich_pending_news()` (inline at end of `/api/news/fetch`, or standalone via `/api/news/enrich`) → scrape on demand via trafilatura (RSS summary as fallback) → call MiniMax for Chinese title/content/tags → mark `enrichment_status='done'`. Rows failing repeatedly record an `enrichment_error` reason; after `MAX_ENRICHMENT_ATTEMPTS` (env, default 3) the row transitions to `failed` and is no longer retried.

## Key Design Notes

- Article categories are keyword-matched in Portuguese; frontend translates to Chinese via `CATEGORY_ZH` maps
- Chinese-interest tags (`tags_zh`) are LLM-classified, piggybacked on the translation call (zero extra API cost)
- MiniMax rate limiting is tight — enrichment runs sequentially with a 3s sleep between calls
- `collect_news` and `enrich_pending_news` are guarded by process-local `threading.Lock`s; concurrent invocations return HTTP 409 `Crawler already running`
- Data stored in SQLite at `data/diarynews.db` (auto-created)

## Workflow

- **Plan first**: Before starting a multi-step feature, write the development plan to `dev-log/` as a markdown file
- **Sequential tasks**: Break plans into discrete tasks. Complete one task at a time, show the result, and wait for user confirmation before starting the next
- **Dev logs**: Record session summaries and development plans in `dev-log/` with date-stamped filenames (e.g. `plan-auth-2026-04-15.md`)
