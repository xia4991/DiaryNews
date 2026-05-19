# Backend Module Cleanup

## Summary

Move remaining backend top-level LLM and database modules into their owning packages:
LLM prompt/brief code goes under `backend/llm/`, and SQLite bootstrap/connection code goes under `backend/storage/`.

## Tasks

1. Move top-level prompt and news brief LLM modules into `backend/llm/`.
2. Move top-level database bootstrap into `backend/storage/`.
3. Update backend and script imports.
4. Compile backend and run targeted import checks.
