# News Long-Content Enrichment (Per-Article)

Follow-up to `plan-news-fetch-content-depth-2026-05-27.md`. That plan added
scraping to the batch path but the symptom persists: the feed has effectively
no "detailed" articles.

## Diagnosis (evidence)

The RSS crawler (Stage A) is healthy. The problem is Stage B (LLM enrichment).

Frontend rule (`react-frontend/src/pages/NewsTab.jsx:112`) — an article is
"detailed" only when:

```js
content_zh.length >= 180 && content_zh.length > summary.length + 40
```

DB state (1,804 enriched rows):

- `content_zh`: 1,750 rows are 1–119 chars, 53 are 120–179, **1 is ≥180**.
- avg `content_zh` = **63 chars**; avg RSS `summary` = 241 chars.
- `scraped_content` populated: **0 of 1,804**.
- enriched via `article_batch_enrichment_v2`: **100%**.
- trafilatura scraping verified working now (newest 5 articles return
  3,367–6,424 char bodies). The body was simply never fetched.

Root causes (compounding):

1. The only automatic enricher is `_news_auto_batch_llm_loop` →
   `auto_batch_enrich_missing_content_news` (the batch path). On committed HEAD
   the batch path sent only RSS title+summary to the LLM — no scrape.
2. The batch prompt crams ≤20 articles into one `max_tokens=4096` call
   (~200 tokens/article across 5 fields) — structurally cannot emit a long
   body. `content_zh` also falls back to `summary_zh` (prompt-capped ≤120 chars).
3. Existing rows are frozen: `list_pending_enrichment*` only pick rows with
   `content_zh = ''`, so a 63-char row is `done` forever.

## Decisions (confirmed with user)

- **Strategy: per-article for the body.** Auto loop scrapes each pending
  article and calls the single-article v2 prompt (`enrich_news_article`,
  1024 tokens, body allowed to be long), 3s apart for rate limits.
- **Scope: going forward only.** Do **not** reset the 1,804 existing short
  rows. Only newly collected articles get long content.

## Tasks

1. [done] Repointed the automatic enrichment loop to the per-article path:
   `_news_auto_batch_llm_loop` → `_news_auto_enrich_loop`, now calls
   `services.enrich_pending_news(NEWS_AUTO_BATCH_LLM_LIMIT)`. Env var names
   kept for deployment back-compat. The per-article path scrapes via
   `ensure_scraped_content` and persists `scraped_content`.
2. [done] Strengthened `article_chinese_prompt`: `content_zh` must complete-
   restate the news, usually ≥200 chars and clearly longer than `summary_zh`,
   faithful, no padding. Bumped single-article `max_tokens` 1024 → 1536. Prompt
   version tag left at `article_enrichment_v2` (JSON contract unchanged).
3. [done] Verified: modules compile; non-destructive live enrichment on 3 real
   short rows produced content_zh 425 / 561 / 646 chars (was 101 / 129 / 115),
   all now "detailed", scraped_content populated. No back-catalog reset.
4. [done] Manual batch endpoint (`/api/news/enrich/batch`) left intact; only
   the automatic loop changed. `auto_batch_enrich_missing_content_news` is now
   unused by the loop (kept in place, not deleted).

## Follow-up — remove the 2000-article cap (2026-05-29)

The old `MAX_ARTICLES = 2000` did two jobs: it **deleted** rows past 2000
(`_trim_articles`) and it **capped** what `GET /api/news` serves (`load_news`,
un-paginated `SELECT *`). Decision (confirmed): store unlimited, serve recent N.

- `config.py`: replaced `MAX_ARTICLES` with two knobs —
  `NEWS_FEED_LIMIT` (env, default 3000) bounds the feed payload, and
  `MAX_STORED_ARTICLES` (env, default 0 = unlimited) controls storage trim.
- `storage/news.py`: `load_news()` serves `NEWS_FEED_LIMIT`; `_trim_articles()`
  is a no-op when `MAX_STORED_ARTICLES <= 0` (never deletes); `merge_articles`
  (legacy) now caps to `NEWS_FEED_LIMIT`.
- Rationale: now that articles carry long `content_zh` + 3–6 KB `scraped_content`,
  an uncapped `/api/news` would reach ~49 MB at 10k rows. Bounding the served
  window keeps the un-paginated frontend fast while storage grows freely.
- Verified: `_trim_articles()` no-ops (2000→2000); `load_news()` ≤ window.

## Out of scope

- Resetting / rebuilding the existing 1,804 short rows (user chose
  going-forward only). `scripts/reset_short_news_content.py` remains available
  if that decision changes.
