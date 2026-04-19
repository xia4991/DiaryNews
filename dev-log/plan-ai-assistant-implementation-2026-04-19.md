# AI Assistant Implementation Plan

Date: 2026-04-19

Related:

- [plan-ai-assistant-rag-2026-04-19.md](/Users/yongbinjiang/Desktop/XAB/projects/DiaryNews/dev-log/plan-ai-assistant-rag-2026-04-19.md)
- [CHAT_PLAN.md](/Users/yongbinjiang/Desktop/XAB/projects/DiaryNews/backend/chat/CHAT_PLAN.md)

## Progress

- `T-AI-01` completed
  - rewrote `backend/chat/CHAT_PLAN.md` to markdown-only v1
- `T-AI-02` completed
  - replaced generic upload-document schema with wiki-first knowledge-base tables
- `T-AI-03` completed
  - added `backend/chat/storage.py` for knowledge-base, ingestion-run, and conversation/message CRUD
- `T-AI-04` completed
  - created repo-level `wiki/` structure for markdown-only knowledge management
- `T-AI-05` completed
  - added seed markdown pages and page-format scaffolding for initial wiki population
- `T-AI-06` completed
  - implemented markdown-aware wiki ingestion, local fallback retrieval, and initial reindex flow
- `T-AI-07` completed
  - added rule-first topic routing for immigration, law, living, work, and general questions
- `T-AI-08` completed
  - added markdown-only prompting rules and insufficient-coverage handling
- `T-AI-09` completed
  - implemented basic RAG orchestration with citations and local no-key fallback answers
- `T-AI-10` completed
  - added FastAPI router and standalone `backend/chat/main.py` for health, reindex, conversation, and message endpoints
- `T-AI-11` completed
  - mounted assistant router in the main FastAPI app under `/api/chat`
- `T-AI-12` completed
  - added `AI 助手` tab, frontend chat page, conversation list, citations display, and manual admin reindex trigger

## Objective

Turn the restructured AI assistant direction into a concrete implementation roadmap that can be executed sequentially inside the current DiaryNews codebase.

This plan assumes:

- `backend/chat/` remains the implementation home
- version `1.0` is markdown-only
- every assistant answer must be grounded in markdown wiki content
- curated documents and news retrieval are postponed to later versions

## Final Product Shape

### User-facing tab

Add a top-level tab:

- `AI 助手`

### Assistant promise

The assistant helps answer:

- Portuguese law basics
- immigration / visa / residency workflows
- practical local-life questions

### Trust promise

Every answer should:

- prefer grounded answers over speculative ones
- cite where the answer came from
- separate wiki-supported answers from unsupported answers
- include light caution language for legal / immigration topics

## Source Model

### V1 source model

Only one source exists in v1:

1. `wiki`

All questions are answered from markdown wiki content only.

## Directory Plan

## 1. Assistant backend

Keep:

- `backend/chat/`

Add:

```text
backend/chat/
  chunking.py
  llm.py
  prompts.py
  rag.py
  router.py
  storage.py
  vectorstore.py
  query_router.py
  ingestion/
    __init__.py
    wiki.py
```

## 2. Wiki content

Create:

```text
wiki/
  immigration/
  law/
  living/
  work/
  services/
```

## 3. Frontend

Later add:

```text
react-frontend/src/pages/AIAssistantTab.jsx
react-frontend/src/components/assistant/
  AssistantSidebar.jsx
  AssistantMessage.jsx
  AssistantComposer.jsx
  SourceCitations.jsx
```

## Data Model Changes

Current `chat.db` tables:

- `documents`
- `conversations`
- `messages`

For v1, we do not need a multi-source model.

## Recommended schema

### `kb_sources`

- `id TEXT PRIMARY KEY`
- `source_type TEXT NOT NULL`
  - `wiki`
- `title TEXT NOT NULL`
- `path_or_ref TEXT NOT NULL`
- `topic TEXT`
- `language TEXT`
- `status TEXT NOT NULL DEFAULT 'ready'`
- `updated_at TEXT`
- `ingested_at TEXT NOT NULL`
- `metadata_json TEXT`

### `kb_chunks`

- `id TEXT PRIMARY KEY`
- `source_id TEXT NOT NULL REFERENCES kb_sources(id) ON DELETE CASCADE`
- `chunk_index INTEGER NOT NULL`
- `section TEXT`
- `content TEXT NOT NULL`
- `vector_id TEXT`
- `created_at TEXT NOT NULL`

### `conversations`

Keep existing shape, optionally add:

- `topic_hint TEXT`

### `messages`

Keep existing shape, but `sources` should reference:

- `source_id`
- `title`
- `section`
- `snippet`
- `updated_at`

### `ingestion_runs`

- `id TEXT PRIMARY KEY`
- `source_group TEXT NOT NULL`
- `status TEXT NOT NULL`
- `started_at TEXT NOT NULL`
- `finished_at TEXT`
- `notes TEXT`

## Query Routing Plan

Add `query_router.py`.

V1 should use **rule-first routing**.

### Suggested buckets

- `law`
- `immigration`
- `living`
- `work`
- `general`

### Rule examples

If query contains words like:

- `签证`, `居留`, `AIMA`, `续居留`, `移民`
  - route to `immigration`

- `法律`, `合同`, `租房`, `劳动法`, `房东`
  - route to `law`

- `NIF`, `NISS`, `SNS`, `报税`, `医保`
  - route to `living`

If rules are ambiguous:

- fallback to general wiki retrieval

## Retrieval Plan

## Retrieval by route

### `immigration`

- retrieve top 5 wiki chunks

### `law`

- retrieve top 5 wiki chunks

### `living` / `work`

- retrieve top 5 wiki chunks

### `general`

- retrieve top 5 wiki chunks across all wiki topics

## Answer Construction Plan

Prompt should instruct the assistant to produce:

1. short direct answer
2. explanation
3. sources used
4. if needed, wiki coverage note

### Required answer rules

- if the wiki does not contain enough support, say so explicitly
- if source support is weak, say so clearly
- do not give definitive legal advice language

## Wiki Structure Plan

## Initial categories

### `wiki/immigration/`

Seed pages:

1. `aima-overview.md`
2. `residency-renewal.md`
3. `family-reunification.md`
4. `student-visa-basics.md`
5. `work-residency-basics.md`

### `wiki/law/`

Seed pages:

6. `rental-basics.md`
7. `work-contract-basics.md`
8. `tenant-rights-basics.md`

### `wiki/living/`

Seed pages:

9. `nif-niss-nsns-basics.md`
10. `public-services-checklist.md`

### `wiki/work/`

Seed pages:

11. `job-hunting-basics.md`
12. `salary-and-contract-checklist.md`

### `wiki/services/`

Seed pages:

13. `important-portuguese-agencies.md`
14. `helpful-local-resources.md`

## Recommended markdown page format

Every wiki page should follow a structured template:

```md
# Title

## Summary

Short overview in simple Chinese.

## What It Means

Explain the practical meaning for users.

## Key Steps / Rules

- ...
- ...

## Important Caveats

- ...

## Related Topics

- [[another-page]]

## Source Notes

- Last reviewed date
```

## Phased Build Plan

## Phase A — Foundation Refactor

Goal:

- reshape generic chat module into markdown-only assistant backend

Tasks:

### `T-AI-01`

Update `backend/chat/CHAT_PLAN.md` to reflect markdown-only v1.

### `T-AI-02`

Extend `backend/chat/database.py` with:

- `kb_sources`
- `kb_chunks`
- `ingestion_runs`

### `T-AI-03`

Implement `storage.py` CRUD for:

- source registration
- chunk registration
- ingestion tracking
- conversations/messages

Acceptance:

- schema initializes cleanly
- sources/chunks can be inserted and listed

## Phase B — Wiki Ingestion

Goal:

- make markdown wiki the first working knowledge layer

Tasks:

### `T-AI-04`

Create repo-level `wiki/` structure.

### `T-AI-05`

Write 5-10 seed markdown pages.

### `T-AI-06`

Implement `ingestion/wiki.py`:

- scan markdown files
- parse headings
- chunk by heading-aware sections
- register in `kb_sources`
- embed into vectorstore

Acceptance:

- wiki can be re-indexed locally
- question can be answered from wiki-only retrieval

## Phase C — Query Router + Prompting

Goal:

- improve retrieval quality inside wiki-only assistant

Tasks:

### `T-AI-07`

Implement `query_router.py`

### `T-AI-08`

Implement `prompts.py`

- answer policy
- markdown-only grounding
- legal / immigration caution language

### `T-AI-09`

Implement `rag.py`

- route question
- retrieve by wiki topic
- build markdown-only prompt
- return structured citations

Acceptance:

- same question type consistently retrieves the correct wiki topic

## Phase D — API and React Integration

Goal:

- expose the assistant as a user-facing feature

Tasks:

### `T-AI-10`

Implement `router.py`

- create/list conversations
- get conversation
- send message
- admin reindex endpoints

### `T-AI-11`

Mount assistant router in main backend

### `T-AI-12`

Create `AIAssistantTab.jsx` and supporting components

Acceptance:

- user can open assistant tab and ask grounded questions end-to-end

## Phase E — Editorial Maintenance

Goal:

- make the assistant maintainable after launch

Tasks:

### `T-AI-13`

Wiki review workflow:

- add “last reviewed” convention
- add missing-topic backlog

### `T-AI-14`

Admin reindex controls:

- reindex wiki

### `T-AI-15`

Gap logging:

- track unanswered question types

Acceptance:

- assistant can improve from real usage, not just initial setup

## Recommended Execution Order

1. `T-AI-01` to `T-AI-03`
2. `T-AI-04` to `T-AI-06`
3. `T-AI-07` to `T-AI-09`
4. `T-AI-10` to `T-AI-12`
5. `T-AI-13` to `T-AI-15`

## Strong Practical Recommendation

The first shippable version should be:

- markdown-only
- Chinese answer-first
- citation-heavy
- clearly scoped to Portugal life / law / immigration

## Deliverables From This Plan

If executed, the repo will gain:

- a domain-specific markdown-based assistant architecture
- a maintainable markdown wiki knowledge system
- a clear trust model for legal / immigration-adjacent answers
