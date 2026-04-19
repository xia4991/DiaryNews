# AI Assistant Plan

Date: 2026-04-19

## Goal

Restructure the existing Chat / RAG direction into a product-aligned **AI assistant** for the Portuguese Chinese community.

This assistant should answer questions about:

- Portugal law and regulations
- immigration / visa / residency workflows
- practical local living knowledge

For **version 1.0**, the assistant should be **markdown-only**:

- all knowledge is curated by you in markdown
- the assistant retrieves only from markdown wiki content
- answers must be based on markdown content, not uploaded files or news retrieval

## Why This Direction

The earlier `backend/chat/CHAT_PLAN.md` direction was closer to a generic document Q&A tool:

- upload arbitrary files
- index them
- chat over those files

That is useful infrastructure, but it is not the clearest first product for this project.

Your stronger product direction is:

> build a trusted Portugal-focused assistant for Chinese users, grounded in a markdown knowledge base that you control and maintain.

That has several benefits:

- clearer product scope
- higher answer consistency
- easier editorial review
- easier git-based maintenance
- lower implementation complexity for v1

## Existing Assets We Should Reuse

### 1. Chat module scaffold

Already planned / scaffolded under:

- `backend/chat/`
- `backend/chat/CHAT_PLAN.md`
- `backend/chat/CLAUDE.md`

This is still useful for:

- module isolation
- separate `chat.db`
- ChromaDB retrieval
- FastAPI router structure
- future React assistant tab

### 2. Markdown-first knowledge direction

Markdown is the right v1 source format because it is:

- easy to write and update manually
- easy to diff in git
- easy to review
- easy to chunk for retrieval
- much easier to trust than mixed raw documents in an early version

## Product Definition

### Working product name

- `AI 助手`
- or `葡萄牙生活助手`

### Product positioning

> 一个面向在葡华人的 AI 助手，基于你维护的 markdown 知识库，帮助回答法律、移民、政策与本地生活相关问题。

### What the assistant should do

- answer factual questions from the markdown wiki
- cite the wiki pages / sections used
- say clearly when the wiki does not contain enough support
- prefer grounded answers over speculative ones

### What the assistant should not do

- pretend to be a lawyer
- answer from model memory when the wiki does not support the answer
- mix in outside knowledge silently
- act like it knows recent developments unless you have written them into markdown

## Core Product Decision

### V1 knowledge source: Markdown wiki only

The markdown wiki should be the only retrieval source in `v1.0`.

Recommended content folders:

- `wiki/law/`
- `wiki/immigration/`
- `wiki/living/`
- `wiki/work/`
- `wiki/services/`

Each page should be narrow and task-oriented, for example:

- `wiki/immigration/aima-overview.md`
- `wiki/immigration/residency-renewal.md`
- `wiki/immigration/family-reunification.md`
- `wiki/law/renting-basics.md`
- `wiki/law/work-contract-basics.md`
- `wiki/living/nif-niss-nsns.md`

### Explicitly not in v1

For version `1.0`, there should be:

- no arbitrary user document upload
- no curated PDF / document retrieval
- no recent news retrieval
- no mixed-source answers

If you want official materials included, the workflow should be:

1. read them
2. summarize / organize them into markdown
3. let the assistant answer from that markdown

## Retrieval Model

### Single-source retrieval

Version `1.0` should use one source domain only:

1. `wiki`

Each chunk should carry metadata like:

- `source_type`: wiki
- `source_id`
- `title`
- `section`
- `updated_at`
- `topic`
- `language`

### Retrieval strategy

For each user question:

1. classify the question into a wiki topic
2. retrieve only from relevant wiki chunks
3. build an answer with explicit wiki citations

There should be no document/news merge logic in v1.

## Answer Policy

The answer format should explicitly separate:

1. direct answer
2. explanation
3. sources used
4. if needed, a wiki coverage note

For higher-risk questions, the assistant should add a soft note like:

- “This is informational, not legal advice”
- “This answer is based on the current wiki content”

## Why Markdown Should Be Central

RAG alone is not enough for this domain if the source material is messy.

If you only index raw documents:

- answers get noisier
- workflows become fragmented
- source quality becomes inconsistent

If you use curated markdown:

- the assistant has a cleaner baseline
- you control language and framing
- the assistant becomes much easier to trust

So the right `v1` model is:

- **Wiki as the assistant’s full knowledge source**

## Recommended Scope for V1

### Included in V1

- AI assistant tab
- conversations
- RAG over markdown wiki only
- source citations in responses
- topic routing across wiki categories
- admin-only wiki reindex / rebuild tools

### Explicitly excluded from V1

- arbitrary user uploads
- curated PDF / document ingestion
- recent news retrieval
- voice
- streaming token-by-token output
- automatic browsing
- complex agent tool use

## Data Model Recommendation

The separate `chat.db` still makes sense, but the schema can stay simpler than a multi-source assistant.

### `kb_sources`

- `id`
- `source_type` — wiki only in v1
- `title`
- `path_or_ref`
- `status`
- `topic`
- `language`
- `updated_at`
- `ingested_at`
- `metadata_json`

### `kb_chunks`

- `id`
- `source_id`
- `chunk_index`
- `section`
- `content`
- `embedding_key` or vectorstore id
- `metadata_json`

### `conversations`

keep as planned

### `messages`

keep as planned, but `sources` should reference:

- source id
- title
- section
- snippet

### `ingestion_runs`

optional but useful:

- `id`
- `source_group = wiki`
- `started_at`
- `finished_at`
- `status`
- `notes`

## Directory Recommendation

Keep `backend/chat/`, but simplify the concept to a markdown-based assistant module.

Suggested structure:

```text
backend/chat/
  main.py
  config.py
  database.py
  storage.py
  vectorstore.py
  rag.py
  prompts.py
  router.py
  query_router.py
  ingestion/
    __init__.py
    wiki.py
  static/
```

And add a repo-level content directory:

```text
wiki/
  immigration/
  law/
  living/
  work/
  services/
```

## Query Routing Layer

Add a lightweight `query_router.py` that classifies incoming questions into buckets such as:

- `law`
- `immigration`
- `living`
- `work`
- `general`

V1 can use:

- rule-first routing
- no LLM routing required

## Safety / Trust Model

### Required answer behavior

- never fabricate source-backed certainty
- prefer “I couldn’t find enough support in the wiki” over guessing
- cite page titles and sections
- distinguish:
  - supported by wiki
  - not found in wiki

### Recommended UI cues

- source badge: `Wiki`
- show page title
- show section title
- show “last updated” when available

### Legal-risk boundary

For law / immigration answers:

- informative guidance is okay
- personalized legal advice should be softened
- answer should stay grounded in what the markdown says

## Recommended Phases

### Phase A — Reframe the module

Goal:

- convert the generic chat concept into a markdown-only assistant concept

Tasks:

- update `backend/chat/CHAT_PLAN.md` direction
- define wiki folder structure
- define wiki-only source metadata model
- define wiki-only query routing behavior

### Phase B — Wiki ingestion

Goal:

- ingest local markdown wiki as the first and only knowledge layer

Tasks:

- create `wiki/` structure
- implement markdown ingestion
- chunk by headings / sections
- index into ChromaDB

Acceptance:

- ask a question answered purely from wiki content

### Phase C — Query router + prompting

Goal:

- improve retrieval quality within markdown-only assistant

Tasks:

- implement topic routing
- implement markdown-only prompt rules
- implement citation formatting

Acceptance:

- assistant consistently retrieves the correct wiki topic

### Phase D — React assistant tab

Goal:

- deliver the user-facing assistant experience

Tasks:

- add `AI 助手` tab
- conversation list
- source citations UI
- wiki source badges

### Phase E — Editorial maintenance

Goal:

- make the assistant maintainable after launch

Tasks:

- reindex wiki
- track missing topics
- add review workflow for markdown pages

## Implementation Recommendation

### Strong recommendation

For `v1.0`, do **not** add:

- user uploads
- curated document ingestion
- recent news retrieval

Start with:

1. markdown wiki
2. markdown-only retrieval
3. markdown-only citations

## Suggested First Build Order

1. Finalize this markdown-only direction
2. Create `wiki/` structure and 5-10 seed pages
3. Implement wiki ingestion into `backend/chat/`
4. Add question routing
5. Build the React assistant tab

## Summary

The right `v1.0` plan is:

> build a domain-specific AI assistant for Chinese people living in Portugal, powered only by a curated markdown wiki, and make every answer grounded in that markdown knowledge base.

That keeps the architecture simple, aligned, and easy to maintain while you build up the knowledge base manually.
