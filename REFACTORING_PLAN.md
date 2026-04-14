# DiaryNews Refactoring Plan

## Context

DiaryNews is a personal Portuguese news aggregator + YouTube tracker with AI summaries. The codebase has grown organically with two frontends (Streamlit and React+FastAPI), a monolithic storage module (357 lines, 6 domains), and orchestration logic duplicated across entry points. This refactoring cleans up the architecture for maintainability and expandability — making it possible to add new content domains (e.g., podcasts) without touching 6+ files.

The React+FastAPI stack is the production path. Streamlit was the prototype and is no longer needed.

---

## Task 1: Remove Streamlit Frontend

**Description**: Delete the Streamlit entry point and all its UI modules. The backend has zero Streamlit contamination (confirmed by grep). `requirements.txt` doesn't even list streamlit.

**Delete**:
- `app.py`
- `frontend/news.py`
- `frontend/youtube.py`
- `frontend/__init__.py`
- Remove the empty `frontend/` directory

**Modify**:
- `CLAUDE.md` — Remove all Streamlit references. Replace `streamlit run app.py` with `python main.py`. Remove `frontend/` from architecture section. Update data flow to describe API-only paths.
- `README.md` — Remove Streamlit from description, update run commands, remove `app.py` and `frontend/` from project structure.

**Acceptance Criteria**:
- [ ] `frontend/` directory and `app.py` do not exist
- [ ] `grep -ri streamlit --include="*.py" --include="*.md"` finds zero hits (excluding `.venv/`)
- [ ] `python main.py` starts FastAPI server successfully
- [ ] All `/api/*` endpoints respond correctly (test: `curl http://localhost:8000/api/status`)
- [ ] React frontend at `https://192.168.31.53:5173` loads and works normally

---

## Task 2: Split `storage.py` into a Package

**Description**: Convert the monolithic `backend/storage.py` into `backend/storage/` package with domain-specific modules. Each domain group has zero cross-domain dependencies (confirmed by analysis). Preserve all import paths via `__init__.py` re-exports so `api.py` needs zero changes.

**Delete**:
- `backend/storage.py`

**Create**:
- `backend/storage/__init__.py` — Re-exports all public functions (compatibility layer)
- `backend/storage/base.py` — `_ensure_db()`, `_set_meta()`, `_get_meta()`, `_db_ready` global
- `backend/storage/news.py` — `load_news`, `save_news`, `merge_articles`, `_bulk_upsert_articles`, `_trim_articles`
- `backend/storage/youtube.py` — `load_youtube`, `save_youtube`, `update_videos`, `_trim_videos`, `add_channel`, `remove_channel`, `update_channel_id`, `save_caption`, `clear_caption`, `_mark_caption_failed`
- `backend/storage/ideas.py` — `load_ideas`, `save_idea`, `update_idea`, `delete_idea`
- `backend/storage/migration.py` — `_migrate_from_json()` (startup-only)

**Gotcha — circular import**: `base._ensure_db()` calls `migration._migrate_from_json()`, which imports `_set_meta` from `base` and `_bulk_upsert_articles` from `news`. Fix: use lazy import inside `_ensure_db()`:
```python
def _ensure_db():
    ...
    _db_ready = True
    from backend.storage.migration import _migrate_from_json  # lazy
    _migrate_from_json()
```

**Acceptance Criteria**:
- [ ] `backend/storage.py` no longer exists; `backend/storage/` is a package with 6 files
- [ ] `from backend import storage; storage.load_news()` works in a Python shell
- [ ] `api.py` requires zero changes — all imports still resolve
- [ ] All `/api/*` endpoints respond identically to before the split
- [ ] Each domain module imports only from `.base`, `backend.database`, and `backend.config` — never from sibling domain modules (except migration, which is startup-only)

---

## Task 3: Create Service Layer

**Description**: Extract orchestration logic from `api.py` into `backend/services.py`. Currently API handlers contain business logic (load existing data, fetch new, merge, timestamp, save). Service functions are synchronous and frontend-agnostic. API handlers become thin: parse request, call service (via `asyncio.to_thread` where needed), translate exceptions to HTTP, return response.

**Create**:
- `backend/services.py`

**Service functions to extract from `api.py`**:

| Function | Extracted from | What it does |
|---|---|---|
| `fetch_and_save_news() -> dict` | `api.py:57-63` | Load existing URLs, fetch feeds, timestamp, save. Returns `{new_count, last_updated}` |
| `add_youtube_channel(handle, category) -> dict` | `api.py:78-90` | Normalize, check duplicates, save. Raises `ValueError`/`DuplicateError` |
| `resolve_and_save_channel(handle) -> dict` | `api.py:101-109` | YouTube API resolve, save channel_id |
| `fetch_and_save_videos() -> dict` | `api.py:116-141` | Resolve unresolved channels, fetch all, update storage. Returns `{new_count, resolve_errors}` |
| `get_or_fetch_caption(video_id) -> dict` | `api.py:147-163` | Check if exists, fetch if not, save. Returns `{caption, attempted}` |

**Modify**:
- `backend/api.py` — Endpoint handlers become thin wrappers calling `services.*`. Pydantic models (`AddChannelRequest`, `IdeaRequest`) stay in `api.py` (HTTP-layer concern). Simple CRUD endpoints (get_news, get_youtube, ideas) stay as-is since they're already one-liners.

**Design rules**:
- `services.py` has no FastAPI imports
- `services.py` has no async — it's synchronous; `api.py` wraps with `asyncio.to_thread`
- Service functions raise domain exceptions (`ValueError`, `KeyError`); API layer translates to `HTTPException`

**Acceptance Criteria**:
- [ ] `api.py` handlers contain no business logic — only HTTP concerns (request parsing, status codes, response formatting)
- [ ] `services.py` has zero imports from `fastapi` or `starlette`
- [ ] All `/api/*` endpoints behave identically to before (same responses, same status codes)
- [ ] Each service function is independently callable from a Python shell

---

## Task 4: Split `config.py` — Separate Infrastructure from Domain Data

**Description**: `config.py` currently mixes database paths and API URLs with RSS source lists and category keyword rules. Split domain data into its own module.

**Create**:
- `backend/sources.py` — Move `RSS_SOURCES` dict and `CATEGORIES` list here

**Modify**:
- `backend/config.py` — Remove `RSS_SOURCES` and `CATEGORIES`. Keep: `DB_PATH`, `MAX_ARTICLES`, `MAX_VIDEOS`, `MINIMAX_API_URL`, `MINIMAX_MODEL`, `ENABLE_WHISPER_*`, `WHISPER_MODEL`
- `backend/news.py` — Change `from backend.config import CATEGORIES, RSS_SOURCES` to `from backend.sources import CATEGORIES, RSS_SOURCES`
- `backend/api.py` — Change `RSS_SOURCES` import to `from backend.sources import RSS_SOURCES`

**Acceptance Criteria**:
- [ ] `config.py` contains only infrastructure constants (no news sources or category keywords)
- [ ] `sources.py` contains only domain data
- [ ] `grep -r "from backend.config import.*RSS_SOURCES\|from backend.config import.*CATEGORIES"` finds zero hits
- [ ] Server starts and `/api/status` returns correct source list

---

## Task 5: Extract Prompt Templates

**Description**: Pull inline LLM prompt strings out of `news.py` and `youtube.py` into a dedicated module. There are exactly 2 prompts: article summary (Portuguese, in `news.py:46-49`) and caption summary (Chinese, in `youtube.py:199-213`).

**Create**:
- `backend/prompts.py` — Two functions:
  - `article_summary_prompt(title: str, content: str) -> str`
  - `caption_summary_prompt(title: str, raw_text: str) -> str`

**Modify**:
- `backend/news.py` — In `_enrich_article()`, replace inline prompt with call to `article_summary_prompt()`. Truncation (`[:3000]`) stays at call site.
- `backend/youtube.py` — In `summarize_caption()`, replace inline prompt with call to `caption_summary_prompt()`. Truncation (`[:12000]`) stays at call site.

**Acceptance Criteria**:
- [ ] No multi-line prompt strings in `news.py` or `youtube.py`
- [ ] `prompts.py` is the single source of truth for all LLM prompts
- [ ] AI summaries produce identical output (same prompt text, just relocated)

---

## Task 6: Update Documentation

**Description**: Final documentation pass to reflect the new architecture accurately.

**Modify**:
- `CLAUDE.md` — Update to describe:
  - FastAPI + React-only architecture
  - `backend/storage/` package structure
  - `backend/services.py` orchestration layer
  - `backend/sources.py` for domain data
  - `backend/prompts.py` for LLM templates
  - Updated data flow: endpoint -> service -> storage
  - Run command: `python main.py` only
- `README.md` — Update project structure tree, setup instructions, architecture description

**Acceptance Criteria**:
- [ ] Documentation accurately describes the current project structure
- [ ] No references to Streamlit, `app.py`, `frontend/`, or JSON file persistence
- [ ] A new developer can understand the architecture from reading either file

---

## Final Architecture After Refactoring

```
backend/
├── api.py              # Thin FastAPI handlers (HTTP concerns only)
├── services.py         # Orchestration layer (fetch -> process -> save)
├── config.py           # Infrastructure constants (DB, API URLs, feature flags)
├── sources.py          # Domain data (RSS feeds, categories)
├── prompts.py          # LLM prompt templates
├── llm.py              # MiniMax API wrapper (unchanged)
├── news.py             # RSS fetching, scraping, classification (unchanged)
├── youtube.py          # YouTube fetching, captions, Whisper (unchanged)
├── utils.py            # strip_html (unchanged)
├── database.py         # SQLite init + connection (unchanged)
└── storage/
    ├── __init__.py     # Re-exports (backward compatibility)
    ├── base.py         # DB init, metadata helpers
    ├── news.py         # News CRUD
    ├── youtube.py      # YouTube videos/channels/captions CRUD
    ├── ideas.py        # Ideas CRUD
    └── migration.py    # JSON -> SQLite migration (startup-only)

react-frontend/         # React SPA (no changes needed)
main.py                 # uvicorn entry point
```

## Verification

After each task, run this checklist:
1. `python main.py` — server starts without errors
2. `curl http://localhost:8000/api/status` — returns valid JSON
3. `curl http://localhost:8000/api/news` — returns news data
4. `curl http://localhost:8000/api/youtube` — returns YouTube data
5. `curl http://localhost:8000/api/ideas` — returns ideas data
6. Open `https://192.168.31.53:5173` — React frontend loads and interacts correctly
