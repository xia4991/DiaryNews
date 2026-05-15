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

## Prompt Output Contract (article_enrichment_v2)

`article_chinese_prompt` returns a strict JSON object. Version tag persisted to `articles.enrichment_prompt_version`:

```python
ARTICLE_ENRICHMENT_PROMPT_VERSION = "article_enrichment_v2"
```

Expected shape:

```json
{
  "title_zh": "中文标题",
  "summary_zh": "2-3 句中文摘要，用于卡片",
  "content_zh": "更完整但精炼的中文正文",
  "tags_zh": ["移民签证", "法律法规"],
  "category": "Sociedade",
  "relevance_reason": "为什么与在葡华人有关；不相关则空字符串"
}
```

Constraints embedded in the prompt:
- `tags_zh` is restricted to the 10 allowed tags; `[]` when not relevant to the Chinese-in-Portugal audience.
- `category` is restricted to the configured Portuguese category set.
- No fabrication of facts beyond the input; names kept in original spelling.

## Parser — `_parse_chinese_response()` in `backend/news.py`

Two-stage with rollout-safe fallback:

1. `_parse_chinese_response_json()` — extracts the JSON object (tolerating Markdown code fences and surrounding chatter), validates types, normalizes `tags_zh` to a comma-separated string of allowed tags only.
2. On JSON failure, falls back to `_parse_chinese_response_lines()` — the legacy `TITLE_ZH:` / `TAGS_ZH:` / `CATEGORY:` / `CONTENT_ZH:` line-prefix parser. `summary_zh` and `relevance_reason` remain `""` in legacy responses.

Always returns the v2-shaped dict: `{title_zh, summary_zh, content_zh, tags_zh, category, relevance_reason}` — all default to `""` if missing.

## Chinese-Interest Tags (10)

移民签证, 房产租房, 法律法规, 工作就业, 教育留学, 税务财务, 华人社区, 安全治安, 医疗社保, 中葡关系

Articles can have multiple tags. Stored as comma-separated string in `articles.tags_zh`.

## Two LLM Calls Per Article

1. **Portuguese summary** (`article_summary_prompt`) — max_tokens: 512
2. **Chinese translation + tags** (`article_chinese_prompt`) — max_tokens: 1024

The tags classification is piggybacked on the translation call — zero extra API cost.

## Retry Logic

`re_enrich_article()` scrapes the article body on demand when `scraped_content` is empty, otherwise reuses the stored body; falls back to RSS `summary` if scraping returns empty. Per-cycle the runner picks up to `max_retry` (default 20) pending rows whose `enrichment_attempts < MAX_ENRICHMENT_ATTEMPTS` (env, default 3). On the attempt that hits the ceiling without producing both `title_zh` and `content_zh`, the row transitions to `failed` with the last `enrichment_error` recorded.
