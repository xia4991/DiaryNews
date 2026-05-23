# Auto Batch LLM For Missing Content

## Goal

Run automatic batch LLM enrichment every 15 minutes, selecting only up to 20 articles that are still missing Chinese content.

## Tasks

1. Add backend config for the auto batch LLM interval and batch limit.
2. Add a storage query for pending enrichment rows with empty `content_zh`.
3. Reuse the existing batch enrichment flow through a small helper so manual batch behavior stays unchanged.
4. Add a startup background loop that calls the missing-content batch service every 15 minutes.
5. Compile backend code.
