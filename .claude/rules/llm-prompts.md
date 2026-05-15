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
- Rate limiting is tight: enrichment runs sequentially with a 3s sleep between calls
- Strips `<think>...</think>` tags from responses

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
