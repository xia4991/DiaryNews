# Crawler Follow-up Improvements Plan - 2026-05-15

## Goal

After the first-priority crawler stability work lands, improve observability, retry control, and debugging clarity. These changes are lower urgency than splitting collect/enrich and restoring full-body enrichment, but they will make crawler behavior easier to operate and test.

## Prerequisite

Complete or account for:

- `dev-log/plan-crawler-stability-2026-05-15.md`
- Especially:
  - full-body enrichment fallback
  - `/api/news/collect`
  - collect/enrich run locks

## Task 1 - Add Enrichment Retry Limits and Failure Reasons

Problem:

`storage.list_pending_enrichment()` currently selects every article whose enrichment is not `done` and has missing Chinese fields. Failed articles can keep returning forever, which may waste MiniMax calls and hide persistent scrape/LLM problems.

Implementation:

1. Add a configurable retry ceiling, for example:

```python
MAX_ENRICHMENT_ATTEMPTS = int(os.environ.get("MAX_ENRICHMENT_ATTEMPTS", "3"))
```

2. Update `backend/storage/news.py::list_pending_enrichment()`:
   - Exclude articles where `enrichment_attempts >= MAX_ENRICHMENT_ATTEMPTS`.
   - Keep ordering by newest articles first.
3. Add a way to store the latest enrichment failure reason.
   - Preferred: add `enrichment_error TEXT DEFAULT ''` to `articles`.
   - Update migration and `CREATE TABLE` schema.
   - Update `_bulk_upsert_articles()` to preserve/write the field.
4. Update `mark_enrichment_status()` to accept an optional `error` argument.
5. In `services.enrich_pending_news()`, store useful failure reasons:
   - scrape empty after retry
   - MiniMax empty response
   - response parse missing required fields
   - exception type/message
6. Update admin recent articles endpoint/UI to expose/display the latest failure reason for failed articles.

Acceptance criteria:

- Articles stop retrying after the configured max attempt count.
- Failed articles show a human-readable failure reason in admin recent articles.
- Successful enrichment clears or ignores the previous error.
- Existing articles without `enrichment_error` migrate safely.

Suggested manual checks:

```sql
SELECT title, enrichment_status, enrichment_attempts, enrichment_error
FROM articles
WHERE enrichment_status != 'done'
ORDER BY published DESC
LIMIT 20;
```

Suggested Playwright coverage:

- Mock recent article data with `enrichment_status: "failed"` and `enrichment_error`.
- Assert the admin crawler panel exposes the failure reason without layout breakage.

## Task 2 - Represent Partial Source Success Explicitly

Problem:

Some adapters can partially succeed. RTP already fetches multiple sub-feeds and may return `status="ok"` while also carrying an error string for failed sub-feeds. In the admin UI this looks healthy even though some coverage was missed.

Implementation:

1. Extend source health statuses to include:

```text
partial_ok
```

2. Update adapter conventions:
   - `ok`: all intended fetches succeeded and entries were parsed.
   - `partial_ok`: at least one sub-fetch failed, but enough succeeded to return articles.
   - `empty`: fetch succeeded but no entries were found.
   - `http_error`: network/status failure.
   - `parse_error`: feed/content parse failure.
3. Update `RTPAdapter.fetch()`:
   - If some sub-feeds fail and at least one succeeds, return `partial_ok`.
4. Update `backend/storage/health.py::upsert_source_health()`:
   - Treat `partial_ok` as non-fatal but do not silently hide the error.
   - Recommended: do not increment `consecutive_failures`, but keep `last_error`.
5. Update `react-frontend/src/pages/AdminModerationTab.jsx`:
   - Add status metadata for `partial_ok`.
   - Use a warning color and label like `部分正常`.
6. Optional: include counts of failed sub-feeds in the adapter error text.

Acceptance criteria:

- RTP with partial sub-feed failure appears as `partial_ok`.
- Admin source health card shows a visible warning state.
- `consecutive_failures` is not incremented for partial success unless the team chooses stricter semantics.
- Error text remains available in the card title/truncated line.

Suggested Playwright coverage:

- Mock `/api/admin/sources/health` with `last_status: "partial_ok"`.
- Assert the source card renders `部分正常`.
- Assert the error text is available or visible according to the UI pattern.

## Task 3 - Add Dedupe and Filtering Run Statistics

Problem:

When articles disappear from a fetch cycle, it is hard to tell whether they were skipped because they were duplicates, too old, already known, or capped by `max_articles`. This makes "why are there fewer news items today?" hard to debug.

Implementation:

1. Extend `CrawlerRunner.run()` to collect run-level stats:

```python
stats = {
    "raw_count": ...,
    "existing_skipped": ...,
    "dedupe_skipped": ...,
    "age_skipped": ...,
    "cap_skipped": ...,
    "returned_count": ...,
}
```

2. Preserve the current public return shape if possible, but add a `stats` field to `collect_news()` result.
3. Update `fetch_and_save_news()` log payload to include these stats.
4. Optional: store the latest run stats in a lightweight table or metadata key.
   - For a first pass, including it in API response and admin log is enough.
5. Update admin UI toast or panel only if it helps:
   - Keep toast short.
   - Add detailed stats in admin logs or expandable source section later.

Acceptance criteria:

- `POST /api/news/collect` returns clear run stats.
- Logs show how many articles were skipped by existing URL, dedupe, age, and cap.
- Existing UI continues to work if it ignores the new field.

Suggested backend checks:

```bash
source .venv/bin/activate && python - <<'PY'
from backend import services
print(services.collect_news(max_new=5, max_age_hours=3))
PY
```

Suggested Playwright coverage:

- No required E2E coverage for internal stats unless displayed in UI.
- If displayed, mock the stats object and assert labels render with web-first assertions.

## Recommended Implementation Order

1. Retry ceiling and failure reasons.
2. `partial_ok` source status.
3. Dedupe/filtering run statistics.

## Manual Verification Checklist

Backend:

- Failed enrichment attempts stop after the configured limit.
- Failure reason is visible in SQLite and API responses.
- Partial adapter success is represented as `partial_ok`.
- Collect responses include useful skip/filter stats.

Frontend:

- Failed article rows show useful error context.
- Partial source health displays as a warning, not full success.
- Existing crawler panel still works when new stats are present.

Playwright:

- Use mocked API responses for failed enrichment and partial source states.
- Prefer `getByRole()` / visible text assertions.
- Do not add fixed sleeps.
