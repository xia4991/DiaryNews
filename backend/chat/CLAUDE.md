# CLAUDE.md — AI Assistant Module

Self-contained markdown-only AI assistant module. It can be developed and tested independently from the parent DiaryNews project.

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run standalone server (port 8001)
python main.py

# Test UI at http://localhost:8001/
```

## Architecture

```
backend/chat/
  main.py          <- Standalone FastAPI server (port 8001, serves API + test UI)
  config.py        <- Paths, MiniMax settings, chunk params
  llm.py           <- MiniMax API wrapper (multi-turn messages)
  database.py      <- chat.db schema init + get_db() context manager
  storage.py       <- CRUD for kb sources, chunks, ingestion runs, conversations, messages
  chunking.py      <- Markdown-aware chunking
  vectorstore.py   <- Vector index init, add/query wiki chunks
  rag.py           <- Retrieval orchestration over markdown wiki
  prompts.py       <- Grounded assistant prompts and answer templates
  query_router.py  <- Rule-first routing into wiki topic buckets
  router.py        <- FastAPI APIRouter (all endpoints)
  ingestion/
    wiki.py        <- Scan and ingest repo-level wiki markdown
  static/
    index.html     <- Standalone test UI (vanilla HTML/JS)
```

## Data flow

1. Add or update markdown pages under `wiki/`
2. Reindex wiki -> scan markdown -> chunk by section -> save source metadata to SQLite -> write chunk vectors
3. Send message -> POST `/api/chat/conversations/{id}/messages` -> route query -> retrieve relevant wiki chunks -> build prompt with history -> call MiniMax -> save response with source references

## Key design notes

- **Version 1 boundary**: only markdown wiki content is used as retrieval source.
- **Isolation**: This module should stay mostly self-contained. It has its own DB, config, and assistant-specific orchestration.
- **Storage**: SQLite at `data/chat.db` (separate from parent's `diarynews.db`). ChromaDB at `data/chroma/`.
- **Embeddings**: ChromaDB default (`all-MiniLM-L6-v2`) — local, free, no API cost.
- **LLM**: MiniMax API via `MINIMAX_API_KEY` env var. Same API as parent project.
- **Integration**: `router.py` exposes an `APIRouter`. Parent mounts it via `app.include_router(router, prefix="/api/chat")`.
- **Paths**: Override with `CHAT_DATA_DIR` env var. Defaults to `data/` (relative to cwd).
- **Trust**: answers should cite markdown pages or clearly say the wiki lacks enough support.

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/chat/admin/reindex-wiki` | Reindex repo-level markdown wiki |
| POST | `/api/chat/conversations` | Create conversation |
| GET | `/api/chat/conversations` | List conversations |
| GET | `/api/chat/conversations/{id}` | Get conversation with messages |
| DELETE | `/api/chat/conversations/{id}` | Delete conversation |
| POST | `/api/chat/conversations/{id}/messages` | Send message, get grounded wiki-only response |

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `MINIMAX_API_KEY` | Yes | LLM API key for chat responses |
| `CHAT_DATA_DIR` | No | Override data directory (default: `data/`) |
