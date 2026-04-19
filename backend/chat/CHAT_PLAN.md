# AI Assistant Module — Markdown-Only V1 Plan

## Purpose

Build an **AI assistant** for DiaryNews that answers questions for the Portuguese Chinese community using a curated markdown knowledge base.

Version `1.0` is intentionally narrow:

- source of truth is markdown only
- assistant answers only from markdown wiki content
- no arbitrary file uploads
- no document ingestion
- no recent news retrieval

This is not a generic personal knowledge base in v1.

It is a **Portugal-focused assistant** grounded in your own markdown wiki.

## Product Scope

The assistant should help answer questions about:

- Portugal law basics
- immigration / visa / residency workflows
- local practical life processes
- work / rental / service basics

The assistant should:

- retrieve relevant markdown chunks
- answer in Chinese
- cite the markdown pages / sections used
- clearly say when the wiki does not contain enough support

## V1 Boundaries

### Included

- markdown wiki ingestion
- vector retrieval over markdown chunks
- conversations
- grounded answers with citations
- topic-based query routing
- standalone backend module
- later React assistant tab integration

### Explicitly excluded

- PDF ingestion
- TXT / arbitrary uploads
- recent news retrieval
- mixed-source retrieval
- personal user document workspace
- streaming output
- tool use / browsing

## Why Markdown-Only First

- easiest to control answer quality
- easiest to maintain in git
- easiest to review and update manually
- lowest implementation complexity
- best match for legal / immigration guidance where trust matters

## Module Structure

```text
backend/chat/
  CLAUDE.md
  CHAT_PLAN.md
  requirements.txt
  __init__.py
  main.py
  config.py
  database.py
  storage.py
  chunking.py
  vectorstore.py
  rag.py
  prompts.py
  query_router.py
  router.py
  ingestion/
    __init__.py
    wiki.py
  static/
    index.html
```

Repo-level content:

```text
wiki/
  immigration/
  law/
  living/
  work/
  services/
```

## Standalone vs Integrated Mode

The module should still work in two modes:

### Standalone

`cd backend/chat && python main.py`

- standalone FastAPI app
- router mounted at `/api/chat`
- local test UI at `/`
- uses `CHAT_DATA_DIR` or `data/`

### Integrated

Mounted by parent DiaryNews app:

```python
from backend.chat.router import router as chat_router
app.include_router(chat_router, prefix="/api/chat")
```

## Database Schema

Use a separate `chat.db`.

### `kb_sources`

```sql
CREATE TABLE kb_sources (
    id           TEXT PRIMARY KEY,
    source_type  TEXT NOT NULL,      -- wiki
    title        TEXT NOT NULL,
    path_or_ref  TEXT NOT NULL,
    topic        TEXT,
    language     TEXT,
    status       TEXT NOT NULL DEFAULT 'ready',
    updated_at   TEXT,
    ingested_at  TEXT NOT NULL,
    metadata_json TEXT
);
```

### `kb_chunks`

```sql
CREATE TABLE kb_chunks (
    id          TEXT PRIMARY KEY,
    source_id   TEXT NOT NULL REFERENCES kb_sources(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    section     TEXT,
    content     TEXT NOT NULL,
    vector_id   TEXT,
    created_at  TEXT NOT NULL
);
```

### `conversations`

```sql
CREATE TABLE conversations (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    topic_hint  TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
```

### `messages`

```sql
CREATE TABLE messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    sources         TEXT,   -- JSON [{source_id, title, section, snippet}]
    created_at      TEXT NOT NULL
);
```

### `ingestion_runs`

```sql
CREATE TABLE ingestion_runs (
    id           TEXT PRIMARY KEY,
    source_group TEXT NOT NULL,      -- wiki
    status       TEXT NOT NULL,
    started_at   TEXT NOT NULL,
    finished_at  TEXT,
    notes        TEXT
);
```

## Chunking Strategy

Markdown-aware chunking should be used.

Recommended rules:

- chunk by headings / sections first
- then split oversized sections with overlap
- preserve page title + heading title in metadata

Defaults:

- `CHUNK_SIZE = 800`
- `CHUNK_OVERLAP = 200`

Each chunk should carry metadata:

- `source_id`
- `title`
- `section`
- `topic`
- `language`

## Query Routing

Use rule-first routing in `query_router.py`.

Suggested buckets:

- `law`
- `immigration`
- `living`
- `work`
- `general`

Example routing hints:

- `签证`, `居留`, `AIMA`, `移民`
  - `immigration`
- `法律`, `合同`, `租房`, `劳动法`
  - `law`
- `NIF`, `NISS`, `SNS`, `报税`
  - `living`

Fallback:

- `general`

## Retrieval Flow

```
User sends message
    |
    v
1. Save user message
2. Route query to a wiki topic bucket
3. Query vectorstore for top wiki chunks
4. Build prompt from retrieved markdown context + recent conversation history
5. Call MiniMax
6. Save assistant response + citations
7. Return response
```

## Prompt Rules

The prompt should enforce:

- answer only from provided markdown context
- if insufficient support exists, say so
- do not invent facts
- cite relevant markdown pages / sections
- for law / immigration topics, add light caution language

## API Endpoints

All under `/api/chat/...`

### Conversations

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/conversations` | Create conversation |
| GET | `/conversations` | List conversations |
| GET | `/conversations/{id}` | Get conversation with messages |
| DELETE | `/conversations/{id}` | Delete conversation |
| POST | `/conversations/{id}/messages` | Send message, get grounded response |

### Admin / ingestion

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/admin/reindex/wiki` | Reindex markdown wiki |
| GET | `/admin/sources` | List indexed wiki sources |

No file-upload endpoint in v1.

## DiaryNews Integration

### Backend

Mount the router from `backend/api.py`.

### Frontend

Later add:

- `AI 助手` tab
- conversation list
- chat area
- source citation display

## Implementation Tasks

### Phase 1 — Markdown Assistant Foundations

**Task 1 — Refactor schema**
- extend `database.py` with `kb_sources`, `kb_chunks`, `ingestion_runs`

**Task 2 — Storage + prompts**
- implement `storage.py`
- implement `prompts.py`

**Task 3 — Wiki ingestion**
- implement `ingestion/wiki.py`
- scan `wiki/`
- chunk markdown
- store embeddings + metadata

**Task 4 — Query router + RAG**
- implement `query_router.py`
- implement `rag.py`
- implement markdown-only answer pipeline

**Task 5 — API + standalone app**
- implement `router.py`
- implement `main.py`
- support conversation flow + admin wiki reindex

### Phase 2 — Test UI

**Task 6 — Standalone test page**
- minimal HTML test UI
- conversation list
- chat box
- source citations

### Phase 3 — DiaryNews Integration

**Task 7 — Backend integration**
- mount router in main app

**Task 8 — React assistant tab**
- create assistant page/components
- add tab and mobile nav entry

## Success Criteria for V1

V1 is successful if:

- you can write markdown pages into `wiki/`
- the assistant indexes them
- the assistant answers only from those markdown pages
- the assistant cites the pages / sections used
- the assistant says clearly when the wiki does not contain enough support

## Future Versions

Possible later additions:

- curated document ingestion
- recent news retrieval
- official-source snapshots
- mixed-source assistant
- personal uploads

But none of these should be in `v1.0`.
