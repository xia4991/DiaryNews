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
- **News**: `news.py` fetches RSS, scrapes articles, enriches via LLM (Chinese translation + classification)
- **Storage**: `storage/` package — SQLite CRUD split by domain (`news.py`, `ideas.py`, `listings.py`)
- **LLM**: `llm.py` wraps MiniMax API; `prompts.py` holds all prompt templates
- **Frontend**: `App.jsx` manages tabs (首页, 华人关注, 葡萄牙新闻, 招聘, Ideas) and state; pages + components render UI

## Data Flow

1. News fetch → POST `/api/news/fetch` → parse 6 RSS feeds (parallel) → scrape + LLM enrich new articles → save to SQLite → retry incomplete articles

## Key Design Notes

- Article categories are keyword-matched in Portuguese; frontend translates to Chinese via `CATEGORY_ZH` maps
- Chinese-interest tags (`tags_zh`) are LLM-classified, piggybacked on the translation call (zero extra API cost)
- MiniMax rate limiting is tight — 2 enrichment workers, 3s sleep between calls
- Data stored in SQLite at `data/diarynews.db` (auto-created)

## Workflow

- **Plan first**: Before starting a multi-step feature, write the development plan to `dev-log/` as a markdown file
- **Sequential tasks**: Break plans into discrete tasks. Complete one task at a time, show the result, and wait for user confirmation before starting the next
- **Dev logs**: Record session summaries and development plans in `dev-log/` with date-stamped filenames (e.g. `plan-auth-2026-04-15.md`)
