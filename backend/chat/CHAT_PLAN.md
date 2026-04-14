# Chat/RAG Module — Specification & Plan

## Purpose

Add a **Chat** tab to DiaryNews — a RAG-powered personal knowledge base. Users upload their own documents (PDF, markdown, text files), the system indexes them, and a chat interface answers questions using retrieved document context via the MiniMax LLM.

This is **not** about querying DiaryNews content (news/YouTube). It's an independent document Q&A system that lives inside DiaryNews as a new tab.

## User Requirements

1. **RAG data source**: External documents uploaded by the user (PDFs, markdown, text files)
2. **LLM**: MiniMax (same API already used by DiaryNews, same `MINIMAX_API_KEY`)
3. **Vector store**: ChromaDB (embedded, on-disk, no external server needed)
4. **Embeddings**: ChromaDB default (`all-MiniLM-L6-v2` via sentence-transformers) — free, local, no API cost per document
5. **Frontend**: Standalone minimal HTML test page for isolated dev + React ChatTab for DiaryNews integration
6. **Isolation**: The module must be fully self-contained inside `backend/chat/` with its own CLAUDE.md, entry point, and requirements. Developing with Claude Code inside this subdirectory should work without needing the parent project context — saving tokens.

---

## Architecture Decisions

### Why a separate `chat.db` instead of adding tables to `diarynews.db`?
Full isolation. The chat module manages its own schema and lifecycle. If removed, just delete `data/chat.db` and `data/chroma/` — no orphaned tables in the main DB.

### Why duplicate `llm.py` (~30 lines) instead of importing from parent?
When Claude Code runs inside `backend/chat/`, `from backend.llm import ...` would fail because the parent package isn't on sys.path. The duplication cost is trivial for true isolation.

### Why local embeddings instead of MiniMax embeddings API?
Embedding 1000 chunks of a large PDF would require 1000 API calls (or batched, still costly and rate-limited). Local `all-MiniLM-L6-v2` is free, fast, and well-tested. ~80MB model, downloads once.

### Why 800-char chunks?
Pragmatic middle ground. Too small (200) creates noisy retrieval fragments. Too large (2000) wastes context window on irrelevant text. 800 chars is roughly a paragraph — a semantically coherent unit.

### Why no streaming responses in v1?
First pass uses synchronous request/response for simplicity. Streaming (SSE) can be added later by changing the `/messages` endpoint to return a `StreamingResponse`. The architecture does not preclude this.

---

## Module Structure

```
backend/chat/
  CLAUDE.md              # Standalone dev instructions for Claude Code
  CHAT_PLAN.md           # This file — specification and plan
  requirements.txt       # chromadb, pypdf2, python-multipart, requests, python-dotenv, fastapi, uvicorn
  __init__.py
  main.py                # Standalone server (port 8001, serves API + test UI)
  config.py              # Paths (DB, ChromaDB, uploads), MiniMax env vars, chunk settings
  llm.py                 # Duplicated MiniMax wrapper (multi-turn messages support)
  database.py            # chat.db schema + get_db() context manager
  storage.py             # CRUD: documents, conversations, messages
  chunking.py            # Parse PDF/MD/TXT + sliding-window chunking
  vectorstore.py         # ChromaDB init, add/query/delete
  rag.py                 # Orchestration: retrieve chunks -> build prompt -> call LLM
  prompts.py             # RAG system prompt + context template
  router.py              # FastAPI APIRouter (all /chat/* endpoints)
  static/
    index.html           # Standalone test UI (vanilla HTML/JS/CSS)
```

**Already created** (Task 1 complete): `__init__.py`, `config.py`, `database.py`, `requirements.txt`, `CLAUDE.md`, `static/`

---

## Standalone vs Integrated Mode

The `router.py` exposes a pure `APIRouter` — identical behavior in both modes.

**Standalone** (`cd backend/chat && python main.py`):
- Creates own `FastAPI()` app, mounts router at `/api/chat`
- Adds CORS (`allow_origins=["*"]`)
- Serves `static/index.html` at `/`
- Port 8001
- Paths resolve from cwd: `./data/chat.db`, `./data/chroma/`, `./data/uploads/`

**Integrated** (DiaryNews mounts it):
- `backend/api.py` adds 2 lines:
  ```python
  from backend.chat.router import router as chat_router
  app.include_router(chat_router, prefix="/api/chat")
  ```
- Paths resolve from DiaryNews root: `data/chat.db`, `data/chroma/`, `data/uploads/`
- No duplicate CORS (parent already handles it)

Path override via env var:
```python
DATA_DIR = os.environ.get("CHAT_DATA_DIR", "data")
```

---

## Database Schema (chat.db)

```sql
CREATE TABLE documents (
    id          TEXT PRIMARY KEY,        -- uuid4
    filename    TEXT NOT NULL,
    file_type   TEXT NOT NULL,           -- pdf, md, txt
    file_size   INTEGER NOT NULL,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    uploaded_at TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'processing'  -- processing, ready, error
);

CREATE TABLE conversations (
    id          TEXT PRIMARY KEY,        -- uuid4
    title       TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,        -- user, assistant
    content         TEXT NOT NULL,
    sources         TEXT,                 -- JSON: [{document_id, filename, chunk_text}]
    created_at      TEXT NOT NULL
);
```

---

## Chunking Strategy

- `CHUNK_SIZE = 800` characters (~200 tokens)
- `CHUNK_OVERLAP = 200` characters
- Split at sentence boundaries (`. `, `! `, `? `) when possible
- PDF: `pypdf2` page-by-page text extraction
- MD/TXT: read as plain text
- Each chunk carries metadata: `{document_id, chunk_index, filename, page_number}`

---

## RAG Flow

```
User sends message
    |
    v
1. Save user message to messages table
2. Query ChromaDB with user message text (top 5 chunks)
3. Build context string from retrieved chunks
4. Load last 10 messages (5 turns) for conversation history
5. Construct: [system_prompt_with_context, ...history, user_message]
6. Call MiniMax (multi-turn messages API)
7. Save assistant response + source references to messages table
8. Return {role, content, sources}
```

---

## API Endpoints

All under the router. When mounted in DiaryNews: `/api/chat/...`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/documents/upload` | Upload file -> parse, chunk, embed |
| GET | `/documents` | List documents with status |
| DELETE | `/documents/{id}` | Remove document + ChromaDB chunks |
| POST | `/conversations` | Create new conversation |
| GET | `/conversations` | List all conversations |
| GET | `/conversations/{id}` | Get conversation with messages |
| DELETE | `/conversations/{id}` | Delete conversation + messages |
| POST | `/conversations/{id}/messages` | Send message, get RAG response |

---

## DiaryNews Integration (3 touchpoints)

### 1. Backend — `backend/api.py` (2 lines)

```python
from backend.chat.router import router as chat_router
app.include_router(chat_router, prefix="/api/chat")
```

### 2. API client — `react-frontend/src/api.js`

```javascript
// Chat - Documents
uploadDocument: (file) => { const fd = new FormData(); fd.append('file', file); return http.post('/chat/documents/upload', fd).then(r => r.data) },
getDocuments: () => http.get('/chat/documents').then(r => r.data),
deleteDocument: (id) => http.delete(`/chat/documents/${id}`).then(r => r.data),

// Chat - Conversations
getConversations: () => http.get('/chat/conversations').then(r => r.data),
createConversation: () => http.post('/chat/conversations').then(r => r.data),
getConversation: (id) => http.get(`/chat/conversations/${id}`).then(r => r.data),
deleteConversation: (id) => http.delete(`/chat/conversations/${id}`).then(r => r.data),
sendMessage: (convId, content) => http.post(`/chat/conversations/${convId}/messages`, { content }).then(r => r.data),
```

### 3. React frontend

- `Header.jsx`: Add `'Chat'` to tab array
- `App.jsx`: Import ChatTab, add render block + mobile nav entry (Chat manages its own state — no new useState in App)
- New files:
  - `react-frontend/src/pages/ChatTab.jsx` — split layout: conversation list left, chat area right
  - `react-frontend/src/components/chat/ChatSidebar.jsx` — conversation list + document management
  - `react-frontend/src/components/chat/MessageBubble.jsx` — message display with source citations
  - `react-frontend/src/components/chat/DocumentUploader.jsx` — drag-and-drop file upload

---

## Implementation Tasks

### Phase 1: Core Backend (standalone, all inside `backend/chat/`)

**Task 1 — Scaffold + config + DB** [DONE]
- Created: `__init__.py`, `config.py`, `database.py`, `CLAUDE.md`, `requirements.txt`, `static/`
- Verified: `init_db()` creates schema, `get_db()` works with WAL + foreign keys

**Task 2 — LLM + storage + prompts**
- Implement `llm.py`: multi-turn `call_minimax(messages, max_tokens, fallback)`
- Implement `storage.py`: CRUD for documents, conversations, messages
- Implement `prompts.py`: RAG system prompt, context template
- **Verify**: Create conversation, add messages, query them back via Python shell

**Task 3 — Document ingestion pipeline**
- Implement `chunking.py`: parse PDF/MD/TXT, sliding-window chunking
- Implement `vectorstore.py`: ChromaDB init, `add_chunks()`, `query()`, `delete_document()`
- Upload orchestration (save file -> chunk -> embed -> update status)
- **Verify**: Upload a test PDF, confirm chunks appear in ChromaDB

**Task 4 — RAG + API endpoints + standalone server**
- Implement `rag.py`: retrieve context, build prompt, call LLM, save response
- Implement `router.py`: all endpoints (documents CRUD, conversations CRUD, send message)
- Implement `main.py`: standalone FastAPI app on port 8001
- **Verify**: `python main.py` starts. Full flow via curl: upload doc, create conversation, send message, get RAG response

### Phase 2: Standalone Test UI

**Task 5 — Test HTML page**
- Create `static/index.html`: document upload area, conversation list, chat interface
- Vanilla HTML/JS/CSS, no build tools
- `main.py` serves it at `/`
- **Verify**: Open `http://localhost:8001/`, upload doc, chat, see source citations

### Phase 3: DiaryNews Integration

**Task 6 — Backend integration**
- Mount chat router in `backend/api.py` (2 lines)
- Add chat dependencies to root `requirements.txt`
- **Verify**: `python main.py` (DiaryNews), all `/api/chat/*` endpoints respond at port 8000

**Task 7 — React ChatTab**
- Create ChatTab.jsx, ChatSidebar.jsx, MessageBubble.jsx, DocumentUploader.jsx
- Add chat methods to api.js
- Update Header.jsx tab array + App.jsx routing + mobile nav
- **Verify**: Chat tab appears, upload works, conversation flows end-to-end in browser

**Task 8 — Documentation**
- Update root `CLAUDE.md`, `README.md` with chat module info
- Finalize `backend/chat/CLAUDE.md`
- **Verify**: All docs accurate

---

## Future Considerations

- **Streaming responses (SSE)**: Change `/messages` endpoint to `StreamingResponse`, frontend uses `EventSource`
- **Index DiaryNews content**: Optionally embed news articles and YouTube captions into the same ChromaDB collection
- **Multiple collections**: Separate ChromaDB collections per topic/project
- **Better chunking**: Markdown-aware splitting (respect headers), semantic chunking
- **Embedding model upgrade**: Swap to multilingual model if querying Portuguese/Chinese documents
