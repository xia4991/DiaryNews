# Admin Crawler Daily Metrics

## Summary

Add Lisbon-day crawler metrics to the admin crawler panel. The backend extends the existing source-health admin response with a `today` object based on `articles.fetched_at`, and the frontend renders daily tiles plus a per-source table for fetched and LLM-processed counts.

## Tasks

1. Add a storage aggregation for today's fetched articles using Europe/Lisbon calendar boundaries.
2. Include the aggregation in `GET /api/admin/sources/health` without changing existing fields.
3. Render daily metric tiles and a source-by-source daily table in the crawler admin panel.
4. Verify backend compile, API shape, and frontend build.
