---
paths:
  - "backend/**/*.py"
  - "main.py"
  - "requirements.txt"
---

# Backend Rules

## File Responsibilities

- **`api.py`** — thin FastAPI REST endpoints (HTTP only: parsing, status codes, responses)
- **`services.py`** — orchestration: coordinates fetching, processing, storage; no FastAPI imports
- **`news.py`** — RSS fetching, scraping (`trafilatura`), keyword classification, LLM enrichment; parallel via `ThreadPoolExecutor(max_workers=2)`
- **`youtube.py`** — channel resolution, Atom feed video fetching, 3-tier caption extraction
- **`llm.py`** — single `call_minimax(prompt, max_tokens, fallback)` wrapper for MiniMax API
- **`prompts.py`** — all LLM prompt templates (see llm-prompts rule for contract details)
- **`database.py`** — SQLite schema init, connection manager, column migrations
- **`config.py`** — constants (DB_PATH, API URLs, feature flags)
- **`sources.py`** — RSS feed URLs, category keyword lists (Portuguese keywords, first-match wins)
- **`storage/`** — SQLite CRUD split by domain: `base.py`, `news.py`, `youtube.py`, `ideas.py`, `migration.py`

## DB Schema — articles table

```
link (PK), title, summary, source, category, published,
scraped_content, ai_summary, title_zh, content_zh, tags_zh
```

- `category` — Portuguese keyword-matched topic (Politica, Desporto, etc.)
- `tags_zh` — comma-separated Chinese-interest tags from LLM (or empty)
- `title_zh` / `content_zh` — Chinese translation from LLM

## Storage Patterns

- All CRUD uses `INSERT OR REPLACE` (upsert by primary key)
- `_trim_articles()` keeps DB at MAX_ARTICLES (2000)
- `_migrate()` adds new columns safely with try/except on ALTER TABLE
- `load_*()` returns `{"last_updated": str, "articles/videos/channels": [dict]}`

## Fetch Flow

1. Parse all 6 RSS feeds in parallel (ThreadPoolExecutor, 6 workers)
2. Filter out existing URLs (skip already-stored articles)
3. Enrich new articles in parallel (2 workers): scrape + 2 LLM calls per article
4. After saving new articles, retry up to 20 incomplete articles (missing title_zh/content_zh/tags_zh)
