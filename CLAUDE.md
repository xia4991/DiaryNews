# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the backend
source .venv/bin/activate
python main.py

# Run the frontend (separate terminal)
cd react-frontend && npm run dev -- --host

# Install dependencies (uses .venv)
source .venv/bin/activate
pip install -r requirements.txt
```

No linter or test suite is configured.

## Architecture

React SPA frontend + FastAPI backend, split into `backend/` and `react-frontend/`:

**Backend — API & orchestration:**
- **`backend/api.py`** — thin FastAPI REST endpoints (HTTP concerns only: request parsing, status codes, response formatting)
- **`backend/services.py`** — orchestration layer: coordinates fetching, processing, and storage; no FastAPI imports

**Backend — business logic:**
- **`backend/news.py`** — RSS fetching, article scraping (`trafilatura`), keyword classification, AI summarization; enrichment runs concurrently via `ThreadPoolExecutor`
- **`backend/youtube.py`** — channel handle resolution, video fetching via Atom feeds, 3-tier caption extraction, `fetch_and_summarize_caption()` orchestrator
- **`backend/llm.py`** — single `call_minimax(prompt, max_tokens, fallback)` used by both news and youtube
- **`backend/prompts.py`** — LLM prompt templates (article summary in Portuguese, caption summary in Chinese)

**Backend — data & config:**
- **`backend/storage/`** — SQLite persistence package split by domain:
  - `base.py` — DB initialization, metadata helpers
  - `news.py` — news article CRUD
  - `youtube.py` — videos, channels, captions CRUD
  - `ideas.py` — ideas CRUD
  - `migration.py` — one-time JSON-to-SQLite migration (startup-only)
  - `__init__.py` — re-exports all public functions for backward compatibility
- **`backend/database.py`** — SQLite schema initialization and connection management
- **`backend/config.py`** — infrastructure constants (DB path, API URLs, feature flags)
- **`backend/sources.py`** — domain data (RSS feed URLs, category keyword lists)
- **`backend/utils.py`** — `strip_html()`

**Frontend** (React SPA):
- **`react-frontend/src/api.js`** — Axios HTTP client wrapping all `/api/*` endpoints
- **`react-frontend/src/pages/`** — NewsTab, YoutubeTab, IdeasTab page components
- **`react-frontend/src/components/`** — Reusable UI components (Header, Sidebar, modals, cards)

**Entry point:**
- **`main.py`** — starts uvicorn with `backend.api:app` on port 8000

## Data flow

1. "Fetch News" → POST `/api/news/fetch` → `services.fetch_and_save_news()` → `fetch_all_feeds()` → scrape + summarize (parallel) → `storage.save_news()` → return count
2. "Fetch Videos" → POST `/api/youtube/fetch` → `services.fetch_and_save_videos()` → resolve unresolved handles → `fetch_all_channels()` → `storage.update_videos()` → return count
3. Caption request → GET `/api/youtube/videos/{id}/caption` → `services.get_or_fetch_caption()` → `fetch_and_summarize_caption()` (tier fallback + summarize) → `storage.save_caption()` → return caption

## Key design notes

- API handlers are thin wrappers — all business logic lives in `services.py` and the domain modules
- Article categorisation is pure keyword matching on lowercased title+summary; first match in `CATEGORIES` wins, fallback is "Geral"
- YouTube videos are fetched from public Atom feeds (`/feeds/videos.xml?channel_id=…`), not the Data API — no quota cost
- Caption results (including failures, stored as `null`) are persisted in the captions table to avoid re-fetching; use DELETE `/api/youtube/videos/{id}/caption` to retry
- Data is stored in SQLite at `data/diarynews.db` (auto-created on first run)
