# Separate Crawler Fetch From News LLM

## Summary

Make news fetching crawler-only. RSS collection saves raw pending rows, while MiniMax-backed translation, summary, tags, category, and relevance enrichment live behind a new `backend/llm/` package and run only from explicit admin enrichment actions.

## Tasks

1. Replace `backend/llm.py` with a `backend/llm/` package that preserves wrapper imports and adds news article enrichment.
2. Keep article scraping/preparation outside the LLM package and rewire enrichment to call the new package.
3. Remove combined fetch + LLM backend paths so scheduler and APIs only collect on fetch.
4. Remove legacy frontend fetch usage and keep separate admin buttons for collect and LLM enrichment.
5. Run backend compile and frontend build checks.
