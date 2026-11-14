# CLAUDE.md

## Ownership

这个代码库归 Claude 负责：做成什么样由 Claude 决定，以后也由 Claude 接着维护（用户 2026-11-11 明确说明）。

- 设计、结构、命名、重构这类技术决定，自己拿主意并执行，不必逐项征求意见；把理由写进 dev-log 或提交信息。
- 按“以后还要自己维护”的标准写：宁可现在做对，不留自己都不想接手的临时方案。
- 发现的问题（bug、过时文档、技术债）主动处理或记录，不等用户指出。

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
- **LLM**: `llm/` package — `minimax.py` wraps the MiniMax API, `article_enrichment.py` builds/parses enrichment calls, `prompts.py` holds all prompt templates
- **Frontend**: `App.jsx` manages tabs (首页, 华人关注, 葡萄牙新闻, 招聘, Ideas) and state; pages + components render UI

## Data Flow

1. **Stage A — collect**: POST `/api/news/collect` (admin UI button) or the hourly background loop (`NEWS_FETCH_INTERVAL`) → `CrawlerRunner` runs all 8 adapters in parallel → dedupe + age filter → save raw articles as `enrichment_status='pending'` → write `source_health` (status one of `ok | partial_ok | empty | http_error | parse_error`)
2. **Stage B — enrich**: `services.enrich_pending_news()` (background loop every `NEWS_AUTO_BATCH_LLM_INTERVAL`, or `/api/news/enrich`; `/api/news/enrich/batch` is the manual one-call batch variant) → scrape on demand via trafilatura (RSS summary as fallback) → call MiniMax for Chinese title/content/tags → mark `enrichment_status='done'`. Rows failing repeatedly record an `enrichment_error` reason; after `MAX_ENRICHMENT_ATTEMPTS` (env, default 3) the row transitions to `failed` and is no longer retried. MiniMax account errors (HTTP 401/402/403) abort the cycle without counting an attempt.

## Key Design Notes

- Article categories are keyword-matched in Portuguese; frontend translates to Chinese via `CATEGORY_ZH` maps
- Chinese-interest tags (`tags_zh`) are LLM-classified, piggybacked on the translation call (zero extra API cost)
- MiniMax rate limiting is tight — enrichment runs sequentially with a 3s sleep between calls
- `collect_news` and `enrich_pending_news` are guarded by process-local `threading.Lock`s; concurrent invocations return HTTP 409 `Crawler already running`
- Data stored in SQLite at `data/diarynews.db` (auto-created)
- Real visitor IP comes from `backend/request_meta.client_ip()` (Cloudflare tunnel → Caddy means the socket peer is always 127.0.0.1); site visit analytics live in `site_events` and the admin 访问统计 tab
- Article view counts are admin-only unless the admin flips 站点设置 → 公开新闻阅读数 (`view_counts_public`); frontend gates them with `useShowViewCounts()`

## Workflow

- **Plan first**: Before starting a multi-step feature, write the development plan to `dev-log/` as a markdown file
- **Sequential tasks**: Break plans into discrete tasks. Complete one task at a time, show the result, and wait for user confirmation before starting the next
- **Dev logs**: Record session summaries and development plans in `dev-log/` with date-stamped filenames (e.g. `plan-auth-2026-04-15.md`)
