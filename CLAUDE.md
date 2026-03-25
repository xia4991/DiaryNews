# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the app
streamlit run app.py

# Install dependencies (uses .venv)
source .venv/bin/activate
pip install -r requirements.txt
```

No linter or test suite is configured.

## Architecture

Single-page Streamlit app with a sidebar + two tabs (News / YouTube), split into `backend/` and `frontend/` packages:

**Backend** (no Streamlit imports):
- **`backend/config.py`** — constants, env vars (via `python-dotenv`), RSS sources, category keyword lists
- **`backend/llm.py`** — single `call_minimax(prompt, max_tokens, fallback)` used by both news and youtube
- **`backend/news.py`** — RSS fetching, article scraping (`trafilatura`), keyword classification, AI summarization; enrichment runs concurrently via `ThreadPoolExecutor`
- **`backend/youtube.py`** — channel handle resolution, video fetching via Atom feeds, 3-tier caption extraction, `fetch_and_summarize_caption()` orchestrator
- **`backend/storage.py`** — atomic JSON read/write (`tempfile` + `shutil.move`); includes caption and channel mutation helpers
- **`backend/utils.py`** — `strip_html()`

**Frontend** (Streamlit only, imports from `backend.*`):
- **`frontend/news.py`** — news tab: filters, article grid, article detail dialog
- **`frontend/youtube.py`** — YouTube tab: channel management, video grid, feed tab, caption dialog

**Entry point:**
- **`app.py`** — page config, sidebar, tab routing; calls `render_news_tab()` and `render_youtube_tab()`

## Data flow

1. "Buscar notícias" → `fetch_all_feeds()` → scrape + summarize (parallel) → `save_news()` → cache cleared → rerun
2. "Buscar vídeos" → resolve unresolved handles → `fetch_all_channels()` → `update_videos()` → rerun
3. Caption button → `fetch_and_summarize_caption()` (tier fallback + summarize) → `save_caption()` → persisted on video object

## Key design notes

- `frontend/` never imports Streamlit-free logic directly — always goes through `backend.*`
- Article categorisation is pure keyword matching on lowercased title+summary; first match in `CATEGORIES` wins, fallback is "Geral"
- YouTube videos are fetched from public Atom feeds (`/feeds/videos.xml?channel_id=…`), not the Data API — no quota cost
- Caption results (including failures, stored as `null`) are persisted on the video object to avoid re-fetching; use "Re-fetch" or `storage.clear_caption()` to retry
- `st.cache_data(ttl=300)` wraps `load_news()` only; YouTube data is always loaded fresh because it's mutated in-session
