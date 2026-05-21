# Sensitive LLM Permanent Fail

## Goal

When MiniMax returns `output new_sensitive`, stop retrying the affected article in future LLM enrichment runs.

## Tasks

1. Add a small service helper that detects MiniMax sensitive-output errors.
2. In single-article enrichment, mark the current article as `failed` immediately.
3. In batch enrichment, only mark as permanently failed when the batch contains exactly one article; otherwise keep the existing unresolved handling to avoid incorrectly failing unrelated articles.
4. Include clear `enrichment_error` text for admin visibility.
5. Compile the backend.
