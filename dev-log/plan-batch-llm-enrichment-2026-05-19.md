# Batch LLM Enrichment With Fixed-Order Array Rows

## Summary

Add a manual admin batch LLM flow that sends up to 20 pending news articles in
one MiniMax call. The prompt uses compact fixed-order array rows and backend code
maps those rows back into normal article enrichment fields by exact title.

## Tasks

1. Add a compact batch prompt for title, RSS summary, and existing content.
2. Add batch LLM parsing/mapping in `backend/llm/article_enrichment.py`.
3. Add a batch enrichment service and admin API endpoint.
4. Add an admin crawler button for `批量 LLM 20篇`.
5. Compile backend and build frontend.
