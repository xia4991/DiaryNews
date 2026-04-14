# CLAUDE.md — Chat/RAG Module

Self-contained RAG-powered chat module. Can be developed and tested independently from the parent DiaryNews project.

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
  config.py        <- Paths (DB, ChromaDB, uploads), MiniMax settings, chunk params
  llm.py           <- MiniMax API wrapper (multi-turn messages)
  database.py      <- chat.db schema init + get_db() context manager
  storage.py       <- CRUD for documents, conversations, messages
  chunking.py      <- Parse PDF/MD/TXT + sliding-window chunking
  vectorstore.py   <- ChromaDB init, add/query/delete chunks
  rag.py           <- RAG orchestration: retrieve context -> build prompt -> call LLM
  prompts.py       <- RAG system prompt + context templates
  router.py        <- FastAPI APIRouter (all endpoints)
  static/
    index.html     <- Standalone test UI (vanilla HTML/JS)
```

## Data flow

1. Upload document -> POST `/api/chat/documents/upload` -> parse file -> chunk text -> embed in ChromaDB -> save metadata to SQLite
2. Send message -> POST `/api/chat/conversations/{id}/messages` -> query ChromaDB for relevant chunks -> build prompt with context + history -> call MiniMax -> save response with source references

## Key design notes

- **Isolation**: This module has zero imports from the parent `backend/` package. It has its own LLM wrapper, DB, and config.
- **Storage**: SQLite at `data/chat.db` (separate from parent's `diarynews.db`). ChromaDB at `data/chroma/`.
- **Embeddings**: ChromaDB default (`all-MiniLM-L6-v2`) — local, free, no API cost.
- **LLM**: MiniMax API via `MINIMAX_API_KEY` env var. Same API as parent project.
- **Integration**: `router.py` exposes an `APIRouter`. Parent mounts it via `app.include_router(router, prefix="/api/chat")`.
- **Paths**: Override with `CHAT_DATA_DIR` env var. Defaults to `data/` (relative to cwd).

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/chat/documents/upload` | Upload and process document |
| GET | `/api/chat/documents` | List documents |
| DELETE | `/api/chat/documents/{id}` | Remove document + embeddings |
| POST | `/api/chat/conversations` | Create conversation |
| GET | `/api/chat/conversations` | List conversations |
| GET | `/api/chat/conversations/{id}` | Get conversation with messages |
| DELETE | `/api/chat/conversations/{id}` | Delete conversation |
| POST | `/api/chat/conversations/{id}/messages` | Send message, get RAG response |

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `MINIMAX_API_KEY` | Yes | LLM API key for chat responses |
| `CHAT_DATA_DIR` | No | Override data directory (default: `data/`) |
