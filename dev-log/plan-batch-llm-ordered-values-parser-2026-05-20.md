# Batch LLM Ordered Values Parser

## Summary

Adapt batch LLM enrichment to the manually updated prompt contract. The LLM now
returns compact fixed-order value rows without original title or relevance
reason, so backend mapping must use row position rather than title matching.

## Tasks

1. Parse batch rows as `[title_zh, summary_zh, content_zh, tags_zh, category]`.
2. Match parsed rows to selected articles by input order.
3. Remove duplicate-title skipping from batch service because title is no longer
   used for matching.
4. Update missing/invalid diagnostics for order-based matching.
5. Compile backend and run parser smoke tests.
