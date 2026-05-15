---
paths:
  - "backend/prompts.py"
  - "backend/llm.py"
  - "backend/news.py"
---

# LLM Prompt Rules

## MiniMax API

- Model: `MiniMax-M2.5` at `https://api.minimaxi.com/v1/chat/completions`
- Auth: `MINIMAX_API_KEY` env var
- Rate limiting is tight: `services.enrich_pending_news` sleeps `MINIMAX_RATE_LIMIT_SLEEP_SEC` (env, default 3) **between** iterations. One-off callers like brief generation do not sleep.
- Strips `<think>...</think>` tags from responses

### Wrapper contract — `call_minimax()`

`call_minimax(prompt, *, max_tokens, model=MINIMAX_MODEL, timeout=MINIMAX_TIMEOUT_SEC, max_retries=MINIMAX_MAX_RETRIES, prompt_version="")`

- Returns the cleaned content string on success.
- Raises one of `MiniMaxError` subclasses on failure — never silent fallback:
  - `MiniMaxConfigError` — `MINIMAX_API_KEY` unset. Callers should abort the batch (operator-fixable).
  - `MiniMaxRateLimitError` — HTTP 429 after internal retries exhausted.
  - `MiniMaxHTTPError` — non-2xx HTTP. 5xx is retried, 4xx is not. `status_code` attribute available.
  - `MiniMaxTimeoutError` — request timeout after retries exhausted.
  - `MiniMaxResponseError` — bad JSON shape or empty content.
- Internal retry: `max_retries` (env `MINIMAX_MAX_RETRIES`, default 2) for transient errors (429 / 5xx / timeout / network). Backoff `1s → 3s → 10s`.
- No internal `time.sleep()`. The legacy 3s pre-call sleep moved to `services.enrich_pending_news`, so one-off brief generation is not silently delayed.

## Prompt Output Contract

The Chinese translation prompt (`article_chinese_prompt`) returns structured output:

```
TITLE_ZH: <Chinese title>
TAGS_ZH: <comma-separated tags, or 无>
CONTENT_ZH: <Chinese refined content — may be multiline>
```

**Critical**: `CONTENT_ZH:` MUST be the last field. The parser grabs everything after `CONTENT_ZH:` as multiline content. Any field added after it will be swallowed.

## Parser — `_parse_chinese_response()`

- Reads lines sequentially
- `TITLE_ZH:` and `TAGS_ZH:` extracted from single lines
- `CONTENT_ZH:` triggers a `break` — everything from that marker to end of text becomes `content_zh`
- `TAGS_ZH: 无` is normalized to empty string `""`
- Returns `{"title_zh", "tags_zh", "content_zh"}` — all default to `""` if missing

## Chinese-Interest Tags (10)

移民签证, 房产租房, 法律法规, 工作就业, 教育留学, 税务财务, 华人社区, 安全治安, 医疗社保, 中葡关系

Articles can have multiple tags. Stored as comma-separated string in `articles.tags_zh`.

## Two LLM Calls Per Article

1. **Portuguese summary** (`article_summary_prompt`) — max_tokens: 512
2. **Chinese translation + tags** (`article_chinese_prompt`) — max_tokens: 1024

The tags classification is piggybacked on the translation call — zero extra API cost.

## Retry Logic

`re_enrich_article()` scrapes the article body on demand when `scraped_content` is empty, otherwise reuses the stored body; falls back to RSS `summary` if scraping returns empty. Per-cycle the runner picks up to `max_retry` (default 20) pending rows whose `enrichment_attempts < MAX_ENRICHMENT_ATTEMPTS` (env, default 3). On the attempt that hits the ceiling without producing both `title_zh` and `content_zh`, the row transitions to `failed` with the last `enrichment_error` recorded.
