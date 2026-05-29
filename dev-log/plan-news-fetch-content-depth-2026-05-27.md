# News Fetch Content Depth

## Goal

Increase the number and quality of fetched news articles. The current pipeline is too restrictive on collection volume and the automatic batch enrichment path often translates only RSS titles/summaries because it does not scrape article bodies before calling the LLM.

## Findings

- Auto collect currently runs with `max_new=15` and `max_age_hours=3`, which caps each cycle aggressively.
- `MIN_SUMMARY_WORDS=30` drops articles whose RSS summary is short even when the article page could provide full content.
- Local DB rows show `scraped_content` is usually empty while `content_zh` is marked done, so the batch enrichment path is producing short translated summaries instead of full article content.
- `Jornal de Notícias` RSS returns 404 and `TVI24` returns an HTML page with zero RSS entries, reducing source coverage.

## Tasks

1. [done] Fix manual/automatic batch enrichment so it scrapes article pages before LLM enrichment and persists the scraped body for future retries.
2. [done] Make auto collection volume/window configurable and raise the defaults so background fetches collect more than 15 recent items.
3. [done] Revisit the short-summary filter so short RSS blurbs are not discarded before body scraping has a chance to recover content.
4. [done] Repair or replace dead RSS sources and add source-level fallbacks where official RSS has moved or retired.
5. [done] Run focused backend verification: compile touched modules and smoke-test crawler/enrichment helpers where possible.
6. [done] Add a dry-run maintenance script to reset historically short `done` rows so the improved enrichment path can rebuild them.
