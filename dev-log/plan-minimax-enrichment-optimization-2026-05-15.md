# MiniMax Enrichment Optimization Plan - 2026-05-15

## Context

DiaryNews currently uses MiniMax for two news workflows:

1. Article enrichment: scrape article body, then ask MiniMax to produce Chinese title, Chinese refined content, Chinese-interest tags, and category.
2. Daily briefs: select articles for a date, build a digest, then ask MiniMax to generate a Chinese title, summary, and bullets.

Current implementation points:

- Article enrichment entrypoint: `backend/services.py::enrich_pending_news`
- Article enrichment logic: `backend/news.py::re_enrich_article`
- MiniMax wrapper: `backend/llm.py::call_minimax`
- Prompt templates: `backend/prompts.py`
- Article storage: `backend/storage/news.py`
- Daily brief builder: `backend/news_briefs.py`

Observed database state on 2026-05-15:

- `articles` total rows: 2000
- `enrichment_status='pending'`: 2000
- Rows with both `title_zh` and `content_zh`: 1364
- Rows with `scraped_content`: 1473
- Rows with `tags_zh`: 858
- `daily_news_briefs` rows: 8
- One recent `china` brief for `2026-05-14` references 170 articles, which is too many for stable brief generation.

The main issue is not only prompt quality. The system needs a stronger enrichment data model, better state repair, structured MiniMax output, and stricter brief input selection.

## Feature 1: Enrichment State Repair and Schema Hygiene

### Goal

Make `articles.enrichment_status` accurately reflect stored enrichment content, and ensure the live SQLite schema matches application code.

### Why

The current database has many rows with Chinese content but `enrichment_status='pending'`. This causes admin stats, retry selection, and operational debugging to lie. Also, code writes `enrichment_error`, but the inspected live schema did not show that column in `PRAGMA table_info(articles)`, so migrations need to be verified end-to-end.

### Files

- `backend/database.py`
- `backend/storage/news.py`
- Optional one-off script under `scripts/` or `backend/tools/`
- `dev-log/summary-2026-05-15.md` after implementation

### Implementation Notes

1. Ensure `_migrate(conn)` always adds:
   - `enrichment_error TEXT DEFAULT ''`
   - `enriched_at TEXT DEFAULT ''`
   - `enrichment_model TEXT DEFAULT ''`
   - `enrichment_prompt_version TEXT DEFAULT ''`
   - `enrichment_input_hash TEXT DEFAULT ''`
2. Add a repair/backfill function or script:
   - If `title_zh` and `content_zh` are non-empty, set `enrichment_status='done'`.
   - If status is `pending` but attempts are at or above `MAX_ENRICHMENT_ATTEMPTS`, set `failed` only when content is incomplete.
   - Do not overwrite existing Chinese content.
3. Update `save_news()` / `_bulk_upsert_articles()` to support the new metadata fields.
4. Consider making `list_pending_enrichment()` rely on content completeness plus retry ceiling, not status alone.

### Acceptance Criteria

- Running the app initializes/migrates `articles` with all enrichment metadata columns.
- Existing completed rows are marked `done`.
- Pending rows are only rows genuinely missing required Chinese fields.
- No completed article is selected again by `list_pending_enrichment()`.
- Admin stats report realistic `done`, `pending`, and `failed` counts.

### Verification

Use SQLite checks:

```sql
PRAGMA table_info(articles);

SELECT enrichment_status, COUNT(*)
FROM articles
GROUP BY enrichment_status;

SELECT COUNT(*)
FROM articles
WHERE enrichment_status != 'done'
  AND title_zh != ''
  AND content_zh != '';
```

Expected final query result should be `0`.

## Feature 2: Article Enrichment V2 Structured Output

### Goal

Replace fragile line-prefix parsing with JSON output from MiniMax, and split true article summary from translated/refined body.

### Why

Current prompt returns:

- `TITLE_ZH`
- `TAGS_ZH`
- `CATEGORY`
- `CONTENT_ZH`

This is parsed with exact string prefixes. A small model formatting change breaks enrichment. Also, `content_zh` currently acts as both article body and summary, while `ai_summary` is misleadingly just the original RSS summary.

### Files

- `backend/prompts.py`
- `backend/news.py`
- `backend/storage/news.py`
- `backend/database.py`
- `react-frontend/src/components/news/ArticleCard.jsx`
- `react-frontend/src/components/news/ArticleCardFeatured.jsx`
- `react-frontend/src/components/news/ArticleModal.jsx`
- Any homepage component that displays article preview text

### Data Model

Add or use these fields:

- `title_zh`
- `summary_zh`
- `content_zh`
- `tags_zh`
- `category`
- `relevance_reason`
- `enriched_at`
- `enrichment_model`
- `enrichment_prompt_version`
- `enrichment_input_hash`

Keep `ai_summary` for backward compatibility, but stop using it as the primary Chinese preview field.

### Prompt Contract

MiniMax should return strict JSON:

```json
{
  "title_zh": "中文标题",
  "summary_zh": "2-3句中文摘要",
  "content_zh": "更完整但精炼的中文正文",
  "tags_zh": ["移民签证", "法律法规"],
  "category": "Sociedade",
  "relevance_reason": "为什么与在葡华人有关；不相关则为空"
}
```

Rules:

- `summary_zh` should be short enough for cards.
- `content_zh` should preserve all key facts and named entities.
- `tags_zh` must only use the configured allowed tags.
- `category` must only use the configured allowed categories.
- If not Chinese-community-relevant, `tags_zh` must be an empty array.
- Do not invent facts not present in the input.

### Implementation Notes

1. Add `ARTICLE_ENRICHMENT_PROMPT_VERSION = "article_enrichment_v2"` near the prompt.
2. Add a JSON parser in `backend/news.py`:
   - Strip code fences.
   - Parse JSON.
   - Validate each field type.
   - Normalize `tags_zh` from list to comma-separated string for current frontend compatibility, or migrate frontend to arrays in a separate feature.
3. Keep a fallback parser for old line-prefix output during rollout.
4. Save `summary_zh` and use it for card previews.
5. Use `content_zh` for detail modal body.

### Acceptance Criteria

- Enrichment succeeds when MiniMax returns strict JSON.
- Existing old-format rows still render.
- Card previews prefer `summary_zh`.
- Article modal prefers `content_zh`.
- Missing or malformed JSON produces a useful `enrichment_error`.
- Re-running enrichment does not overwrite valid old content with empty fields.

### Verification

- Unit-style manual check by calling the parser with:
  - valid JSON
  - JSON inside Markdown fences
  - old `TITLE_ZH:` format
  - malformed text
- Run one enrichment with `max_retry=1` against a safe pending article.
- Inspect the updated row for `summary_zh`, `content_zh`, `enrichment_status`, and metadata.

## Feature 3: MiniMax Wrapper Reliability and Observability

### Goal

Make MiniMax failures diagnosable and retry behavior intentional.

### Why

`call_minimax()` currently catches all exceptions and returns an empty fallback. The caller cannot distinguish missing API key, HTTP 429, timeout, bad response shape, or empty model output. That makes retries wasteful and hides production failures.

### Files

- `backend/llm.py`
- `backend/services.py`
- `backend/news.py`
- `backend/news_briefs.py`
- Optional: `backend/storage/admin_logs.py`

### Implementation Notes

1. Introduce a small result type or exception hierarchy:
   - `MiniMaxConfigError`
   - `MiniMaxRateLimitError`
   - `MiniMaxHTTPError`
   - `MiniMaxTimeoutError`
   - `MiniMaxResponseError`
2. Keep a compatibility wrapper if necessary, but article enrichment should receive structured failure details.
3. Log:
   - model
   - prompt version
   - timeout/retry count
   - HTTP status
   - truncated response body for errors
4. Add bounded retry only for transient errors:
   - 429
   - 5xx
   - timeout
5. Do not retry missing API key or invalid response contract indefinitely.
6. Consider moving the fixed `time.sleep(3)` out of `call_minimax()` into the batch runner, so one-off brief generation is not silently delayed and rate limiting is explicit.

### Acceptance Criteria

- Missing `MINIMAX_API_KEY` produces a clear failure reason.
- HTTP 429 is recorded distinctly from parser failure.
- `enrichment_error` stores actionable error text.
- Batch enrichment still respects MiniMax rate limits.
- Daily brief generation does not silently fall back when the real issue is configuration.

### Verification

- Run with `MINIMAX_API_KEY` unset and confirm error visibility.
- Mock or simulate bad MiniMax JSON and confirm parser error.
- Confirm transient failures increment attempts without wiping content.

## Feature 4: Daily Brief Input Selection and Generation Quality

### Goal

Make daily brief generation concise, bounded, and based on high-quality enriched articles.

### Why

The current `china` brief selector includes every article with non-empty `tags_zh` for that day. One recent brief referenced 170 articles. That is too much prompt input and leads to fallback summaries or diluted output. Briefs should be editorially selected, not a raw dump.

### Files

- `backend/news_briefs.py`
- `backend/prompts.py`
- `backend/storage/news_briefs.py`
- Optional frontend display files under `react-frontend/src/components/news/`

### Implementation Notes

1. Only use articles with:
   - `enrichment_status='done'`
   - non-empty `summary_zh` or `content_zh`
2. Add strict caps:
   - `MAX_CHINA_BRIEF_ARTICLES = 20`
   - `MAX_PORTUGAL_BRIEF_ARTICLES = 20`
3. Rank China brief candidates by:
   - number of relevant tags
   - configured high-priority tags first, e.g. `移民签证`, `法律法规`, `工作就业`, `税务财务`, `安全治安`
   - source freshness/published time
4. Deduplicate near-identical articles before building the digest.
5. Update `_article_digest()` to use `summary_zh`, not full `content_zh`, when available.
6. Add `generation_status` or `generated_by` metadata to daily briefs:
   - `llm`
   - `fallback`
   - `failed`
7. If MiniMax fails, either:
   - store an explicit fallback brief marked as fallback, or
   - return an error and let the admin retry.

### Acceptance Criteria

- No brief uses more than the configured article cap.
- Brief digest input uses short Chinese summaries.
- Brief text does not contain raw Portuguese titles unless there is no Chinese title.
- Fallback briefs are distinguishable from LLM-generated briefs.
- China briefs focus on genuinely China/community-relevant topics.

### Verification

Use SQLite checks:

```sql
SELECT brief_type, brief_date, article_count, title, substr(summary_zh, 1, 120)
FROM daily_news_briefs
ORDER BY brief_date DESC, brief_type;
```

Expected:

- `article_count <= 20`
- summary reads as natural Chinese
- no accidental huge fallback from hundreds of articles

## Feature 5: Frontend Preview Semantics

### Goal

Render the correct field for each UI surface after enrichment v2.

### Why

The frontend currently uses `content_zh || ai_summary || summary` in multiple places. Once `summary_zh` exists, cards should use short summary text and the modal should show the fuller content.

### Files

- `react-frontend/src/components/news/ArticleCard.jsx`
- `react-frontend/src/components/news/ArticleCardFeatured.jsx`
- `react-frontend/src/components/news/ArticleModal.jsx`
- `react-frontend/src/pages/HomePage.jsx`
- `react-frontend/src/App.jsx` if filtering/tag logic changes

### Display Rules

- Card preview:
  - `summary_zh || content_zh || ai_summary || summary`
- Featured card preview:
  - `summary_zh || content_zh || ai_summary || summary`
- Article modal body:
  - `content_zh || summary_zh || ai_summary || summary`
- Original section:
  - `scraped_content || summary`

### Acceptance Criteria

- News cards are concise and do not show long article bodies.
- Modal still gives enough detail.
- Existing legacy data still renders.
- No blank cards when a row only has old fields.

### Verification

- Run frontend and inspect home page, Chinese-interest tab, Portugal news tab, and article modal.
- Check mobile card layout for long Chinese text.

## Feature 6: Admin and Operations Visibility

### Goal

Give operators a clear view of enrichment health and why rows are pending or failed.

### Why

LLM pipelines fail in many ways: scrape failure, API key issue, rate limit, parser mismatch, prompt overrun, model empty output. Admin UI should show enough signal to fix the right thing.

### Files

- `backend/storage/news.py`
- `backend/api.py`
- Existing admin frontend components for source health/news recent

### Implementation Notes

1. Extend recent news admin response with:
   - `summary_zh`
   - `content_zh` length
   - `scraped_content` length
   - `enriched_at`
   - `enrichment_model`
   - `enrichment_prompt_version`
   - `enrichment_error`
2. Add aggregate stats:
   - total done/pending/failed
   - pending by source
   - failed by error type
   - rows with scraped content but no Chinese content
3. Keep UI small: this can start as table columns or expandable diagnostics.

### Acceptance Criteria

- Admin can tell whether a row is pending because of missing content, MiniMax error, parse error, or retry ceiling.
- Admin can identify sources with poor scrape/enrichment rates.
- Recent news list does not require direct SQLite inspection for common debugging.

## Recommended Execution Order

1. Feature 1: repair schema and state first.
2. Feature 3: make MiniMax failures observable before changing prompts.
3. Feature 2: introduce structured article enrichment v2.
4. Feature 5: adjust frontend field usage after `summary_zh` exists.
5. Feature 4: improve daily brief selection and generation.
6. Feature 6: expand admin visibility.

## Cross-Agent Handoff Notes

- Do not rewrite crawler adapters for this plan.
- Do not change collection behavior except where enrichment state depends on it.
- Preserve existing article rows and never blank out non-empty Chinese fields during migration or failed retries.
- Keep old field compatibility until frontend and existing data are fully migrated.
- No linter or automated test suite is configured, so include manual verification commands in each implementation summary.
- Follow the repository workflow: implement one feature at a time, summarize results, and wait for confirmation before starting the next feature.

