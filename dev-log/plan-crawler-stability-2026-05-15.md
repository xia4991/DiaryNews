# Crawler Stability Plan - 2026-05-15

Skills used: `playwright-pro`, `senior-backend`

## Goal

Improve the current crawler flow without rewriting the adapter architecture. The highest-value work is to make enrichment use real article bodies again, separate fast collection from slow LLM work for the admin UI, and prevent overlapping crawler runs.

## Current Context

- Stage A already exists as `services.collect_news()` and runs `backend.crawler` adapters.
- Stage B exists as `services.enrich_pending_news()` and calls `re_enrich_article()`.
- Admin UI currently calls `api.fetchNews()`, which maps to `POST /api/news/fetch`.
- `/api/news/fetch` still runs both Stage A and Stage B through `services.fetch_and_save_news()`.
- Frontend axios timeout is 15 seconds, while LLM enrichment can exceed that.
- There is no existing Playwright config or E2E test suite in the repo.

## Non-goals

- Do not replace the 9-source adapter system.
- Do not add new news sources.
- Do not redesign the news UI.
- Do not change MiniMax prompt behavior unless needed to preserve existing output fields.

## Task 1 - Restore Full-Body Enrichment

Problem:

Newly collected raw articles are saved as `pending` with no `scraped_content`. `enrich_pending_news()` calls `re_enrich_article()`, but `re_enrich_article()` only uses existing `scraped_content` or RSS `summary`; it does not call `scrape_article()` when the body is missing.

Implementation:

1. Update `backend/news.py`.
2. Make `re_enrich_article(article)` scrape the article body when `article.get("scraped_content")` is empty.
3. Preserve fallback behavior: if scraping fails or returns empty text, use `summary`.
4. Return the newly scraped body in `scraped_content` so `storage.save_news()` persists it.
5. Keep existing category/tag fallback behavior.
6. Consider renaming internally or adding a small helper so the distinction is clear:
   - `get_article_text_for_enrichment(article)`
   - or `ensure_scraped_content(article)`

Acceptance criteria:

- A pending article with empty `scraped_content` triggers one scrape attempt.
- A pending article with existing `scraped_content` does not scrape again.
- Failed scraping still allows LLM enrichment using RSS summary.
- Successful enrichment stores `scraped_content`, `title_zh`, `content_zh`, `tags_zh`, and final `category`.

Suggested backend checks:

```bash
source .venv/bin/activate && python - <<'PY'
from backend.news import re_enrich_article

# Monkeypatch manually in a scratch run if needed:
# - scrape_article returns "FULL BODY"
# - call_minimax returns TITLE_ZH/TAGS_ZH/CATEGORY/CONTENT_ZH
# Verify scraped_content is persisted in returned dict.
PY
```

Risk:

This increases per-article Stage B time because scraping now happens during enrichment. That is acceptable if Task 2 separates collect from enrich in the admin UI.

## Task 2 - Split Admin "Collect" from "Enrich"

Problem:

`POST /api/news/fetch` runs both collection and LLM enrichment. The admin button "立即抓取" can appear failed because frontend timeout is 15 seconds while enrichment can take longer.

Implementation:

1. Add a new endpoint in `backend/api.py`:

```python
@app.post("/api/news/collect")
async def collect_news(_admin: dict = Depends(require_admin)):
    return await asyncio.to_thread(services.collect_news)
```

2. Preserve existing `POST /api/news/fetch` for backward compatibility.
3. Update `react-frontend/src/api.js`:

```javascript
collectNews: () => http.post('/news/collect').then(r => r.data),
```

4. Update `CrawlerSection` in `react-frontend/src/pages/AdminModerationTab.jsx`:
   - "立即抓取" should call `api.collectNews()`.
   - Toast should say only collection result, for example: `抓取完成：新增 X 条`.
   - "重试翻译" continues to call `api.enrichNews({ max_retry: 20 })`.
5. Optional but useful: rename button text to "抓取新文章" and keep "重试翻译" as separate action.

Acceptance criteria:

- Clicking admin "立即抓取" does not trigger MiniMax enrichment.
- Clicking admin "重试翻译" does not collect RSS feeds.
- Existing `/api/news/fetch` still works for legacy callers.
- Admin UI reloads source health and recent articles after either action.

Suggested backend checks:

```bash
source .venv/bin/activate && python main.py
```

Then, with admin auth available, verify:

```bash
curl -X POST http://localhost:8000/api/news/collect
curl -X POST "http://localhost:8000/api/news/enrich?max_retry=5"
```

Suggested Playwright coverage:

Because this repo does not yet have Playwright, first add minimal config only if implementation scope allows:

```bash
cd react-frontend && npm install -D @playwright/test
cd react-frontend && npx playwright install --with-deps chromium
```

Test behaviors with mocked API responses:

- Admin crawler panel displays source health.
- Clicking "立即抓取" calls `/api/news/collect`, not `/api/news/fetch`.
- Success toast shows new article count.
- Error toast appears when collect returns 500.
- Clicking "重试翻译" calls `/api/news/enrich`.

Playwright rules:

- Use `getByRole()` for buttons.
- Use `page.route()` to mock API responses.
- Use web-first assertions like `await expect(locator).toBeVisible()`.
- Do not use `page.waitForTimeout()`.

## Task 3 - Add Crawler Run Lock and Clear Busy Status

Problem:

Auto-fetch and manual admin actions can overlap. Two runs may compete for RSS sources, SQLite writes, and MiniMax calls. The UI currently only knows its local button is busy; the backend has no shared "already running" state.

Implementation:

1. Add a process-local lock in `backend/services.py`.
2. Protect Stage A collection with a lock.
3. Protect Stage B enrichment with a separate lock, or use one shared lock if you want the simplest first version.
4. When a run is already active, return a structured result rather than starting another run.

Suggested shape:

```python
_collect_lock = threading.Lock()
_enrich_lock = threading.Lock()

def collect_news(...):
    if not _collect_lock.acquire(blocking=False):
        return {"status": "already_running", "new_count": 0, "sources": []}
    try:
        ...
    finally:
        _collect_lock.release()
```

5. Update `backend/api.py` so endpoints can map `already_running` cleanly:
   - Either return HTTP 200 with `status: "already_running"`.
   - Or raise HTTP 409 with detail `"Crawler already running"`.
6. Prefer HTTP 409 for API clarity, but if UI simplicity matters more, use HTTP 200 plus a warning toast.
7. Update admin UI to show a friendly message:
   - `已有抓取任务正在运行`
   - `已有翻译任务正在运行`

Acceptance criteria:

- Two simultaneous collect requests do not run two crawler cycles.
- Two simultaneous enrich requests do not run two MiniMax batches.
- Auto-fetch cannot overlap with manual collect/enrich in a harmful way.
- Admin UI shows a clear message for already-running state.

Suggested backend checks:

```bash
source .venv/bin/activate && python - <<'PY'
from concurrent.futures import ThreadPoolExecutor
from backend import services

with ThreadPoolExecutor(max_workers=2) as ex:
    results = list(ex.map(lambda _: services.collect_news(max_new=1, max_age_hours=3), range(2)))
print(results)
PY
```

Suggested Playwright coverage:

- Mock `/api/news/collect` as 409 and assert the admin panel shows the friendly message.
- Mock `/api/news/enrich` as 409 and assert the same for translation.

## Recommended Implementation Order

1. Task 1: restore full-body enrichment.
2. Task 2: add `/api/news/collect` and switch admin UI to it.
3. Task 3: add backend locks and already-running UI handling.
4. Add Playwright setup and E2E tests after the behavior is stable.

## Manual Verification Checklist

Backend:

- `POST /api/news/collect` returns quickly and updates source health.
- `POST /api/news/enrich?max_retry=5` enriches pending articles.
- Freshly enriched rows have non-empty `scraped_content` when scraping succeeds.
- Failed scraping still produces fallback enrichment from `summary`.
- Concurrent duplicate runs are blocked or reported as already running.

Frontend:

- Admin crawler panel loads source health and recent articles.
- "立即抓取" only collects news.
- "重试翻译" only enriches pending articles.
- Loading state clears after success, failure, and already-running responses.
- Toast text accurately distinguishes collect vs enrich.

Playwright:

- Mocked admin crawler tests pass without hardcoded localhost URLs.
- Tests use semantic locators and web-first assertions.
- No `page.waitForTimeout()` is introduced.
