# Crawler Capability Plan — Full Content + Cross-Source Dedup

Goal (user): crawl Portuguese news with **full body content for every article** (not
just titles), and **filter duplicate content across different platforms**.

This plan was produced from a code-grounded audit of the live crawler plus 2026
best-practice research (claims verified against the running feeds + installed env).

## Where we already are (do NOT re-do)

Full-content capture for **new** articles is largely solved by recent work:

- `plan-news-fetch-content-depth-2026-05-27.md`: batch path now scrapes bodies.
- `plan-news-long-content-per-article-2026-05-29.md`: the auto loop is the
  **per-article** path (`_news_auto_enrich_loop` → `services.enrich_pending_news`),
  which scrapes via `news.ensure_scraped_content` and persists `scraped_content`;
  single-article prompt bumped to 1536 tokens; new rows verified at 425–646 char
  `content_zh` with 3–6 KB `scraped_content`. **Going-forward only** — the 1,804
  legacy short rows were intentionally left alone.

So the remaining content work is about **robustness and coverage**, not the basic
mechanism. The genuinely new capability is **cross-source deduplication**.

## Decisions (confirmed with user, 2026-05-29)

- **Order**: start with WS1 (content:encoded). One task at a time.
- **Dedup UX (WS5)**: collapse grouped duplicates to one representative card + an
  "N sources" badge.
- **Layer-2 confirmer (WS5)**: start with trafilatura's built-in SimHash (zero new
  deps); add scikit-learn TF-IDF only if SimHash misses reworded republishes.
- **WS1 storage**: clean `content:encoded` into the existing `scraped_content` column
  **at Stage A** (no migration); carry the raw HTML only in-memory and drop it before
  persistence. (Resolves open question #4.)

## Verified facts (against live feeds + installed env, 2026-05-29)

- **DN (`dn.pt/feed/`) and ECO (`eco.sapo.pt/feed/`) ship the FULL body in
  `content:encoded`** (`entry.content[0].value`, ~4–6 KB → ~3.4–3.7 KB clean text).
  Observador, SAPO24, RTP ship only teasers and need HTML scraping.
- `crawler/base.py` `parse_entry` (~line 100) reads only `entry.summary/description`
  (truncated to 500 chars) and **never inspects `entry.content`** → DN/ECO full
  bodies are discarded today.
- `news.py` `scrape_article` calls `trafilatura.extract` with **all defaults**
  (no `url=`, no `favor_recall`) and applies **no quality gate** — empty/short
  extractions fall silently back to the RSS summary.
- Cross-source dedup is **intra-run only** (`crawler/parsing.py` `deduplicate`,
  `token_sort_ratio > 70` on same-day titles) and **never persisted**. A slow
  source republishing hours later is missed. A brief-only 8-char-title dedup
  exists in `llm/news_briefs.py` but does not touch the main collection.
- Installed: `trafilatura==2.0.0`, `rapidfuzz==3.12.2`, `feedparser`, Python 3.9.6.
  **Not** installed: `scikit-learn`, `sentence-transformers`.
- `scripts/reset_short_news_content.py` / `purge_short_articles.py` already exist —
  the truncation problem is recurring.

## Track A — Full-content robustness & coverage

### WS1 — Full-text RSS capture (`content:encoded`)  [effort: S] — DONE 2026-05-29
Stop discarding bodies DN/ECO already give us; reuse as `scraped_content` so
Stage B skips the network for those sources.
- [done] `crawler/base.py`: added `rss_full_html` to `RawArticle` + `extract_full_html(entry)`
  reading `entry.content[0].value` (guards list/dict shape); 500-char summary unchanged.
- [done] `news.py`: added `extract_rss_fulltext(html)` — cleans the feed HTML fragment via
  `trafilatura.extract`; returns `''` on failure (caller length-gates).
- [done] `config.py`: `RSS_FULLTEXT_MIN_WORDS` (env, default 250; 0 disables).
- [done] `services.py`: `_adopt_rss_fulltext(articles)` runs after `run_all`, before save —
  cleans + length-gates `content:encoded` into `scraped_content`, drops the in-memory
  `rss_full_html` key, and reports the count via `stats["rss_fulltext_count"]`. Preserves
  any existing `scraped_content`.
- [done] Verified live: DN 10/10 and ECO 8/10 entries clean to ≥250 words (≈568/590-word
  samples); Observador's 5 `content:encoded` are teasers and correctly rejected by the
  gate. End-to-end `parse_entry → to_dict → _adopt_rss_fulltext` populated scraped_content
  (3446/2792/4910c) and removed the raw key. Four modules byte-compile.
- Note: chose to populate `scraped_content` at Stage A (no migration); Stage B's
  `ensure_scraped_content` reuses it and skips the network automatically.

### WS2 — Retune trafilatura + truncation detection (self-healing chain)  [effort: M] — DONE 2026-05-29
- [done] `news.py` `scrape_article(url, *, with_consent=False)`: now passes `url=url`,
  `favor_recall=True`, keeps the default-on readability+jusText fallback chain;
  shared `_UA` constant. Kept plain-text output (skipped `output_format='markdown'`
  to avoid changing the stored/displayed body format).
- [done] `is_truncated(text, summary)`: trips on empty, shorter-than-summary
  (primary signal), `< TRUNCATION_MIN_WORDS` (120), or a **short** body carrying a
  consent/paywall marker (marker only counts when `< 250` words, so real articles
  mentioning the words aren't nuked). Unit-tested 6 cases, all pass.
- [done] Consent-cookie retry: `_CONSENT_COOKIES` (Cookiebot `CookieConsent`,
  OneTrust `OptanonAlertBoxClosed`, IAB/Didomi `euconsent-v2`) sent on the
  escalation fetch. `ensure_scraped_content` is now a chain: plain scrape → (on
  truncation) consent retry → keep the richer text; persist only a body that passes
  the gate, else feed the LLM the richer of body/summary and persist `''` so a
  future retry (or WS7 Playwright) can try again.
- [done] `reset_scrape_caches()` called at the end of each `enrich_pending_news`
  cycle to bound trafilatura cache growth.
- [done] Verified: modules compile; live Observador article scraped to 1131 words
  (not truncated); `ensure_scraped_content` persisted full 7002c body, capped LLM
  input at 3000c. Batch path (`services.py:270`) inherits the chain unchanged.
- Risk noted: `favor_recall`+fallbacks ~2× extraction time — fine under 3s LLM pacing.

**Deferred from WS2 (need decisions / later workstreams):**
- Separate **scrape-failure vs LLM-failure** retry budgets → open question #5 (status
  machine is delicate; not touched without the decision).
- Per-source timeout tuning → optional, skipped.
- Admin-triggered **re-scrape** of short `done` rows → open question #6.
- Headless-browser escalation → WS7 (deferred).

## Track B — Cross-source deduplication (the new feature)

Tiered pipeline: **cheap pre-filter → body confirmer → optional LLM tie-breaker**,
persisted via a `story_group_id`. We do **not** delete duplicates — we group them so
the UI can collapse a story to one representative with an "N sources" badge.
Explicitly **defer** MinHash+LSH/datasketch (no SQLite backend; payoff is at
millions of docs; 2025 ACM benchmark shows hash-LSH underperforms on real news).

### WS3 — Schema + migration  [effort: S]
- `storage/database.py` `_migrate` (additive, try/except like existing): add
  `story_group_id TEXT DEFAULT ''`, `content_hash TEXT DEFAULT ''`, optional
  `story_group_size INTEGER`, `is_group_primary INTEGER`. Mirror in `init_db` DDL.
- Indexes: `idx_articles_story_group`, `idx_articles_content_hash`.
  (`enrichment_input_hash` already exists but is unused — decide repurpose vs new.)
- Thread new columns through `_bulk_upsert_articles`. **Semantics differ**:
  `content_hash` is preserve-on-empty; `story_group_id` must be **re-assignable**
  by the grouping pass (NOT preserve-on-empty). Keep INSERT/VALUES/ON CONFLICT/dict
  in lockstep.

### WS4 — Layer 0+1: content hash + cross-cycle title pre-filter  [effort: M]
- Layer 0: compute `content_hash` (SHA-256 of HTML-stripped, whitespace-collapsed,
  lowercased body) in Stage B once `scraped_content` exists → exact-dup short-circuit.
- Layer 1: extend `crawler/parsing.py` `deduplicate` — normalize titles (lowercase,
  `unicodedata` accent-strip, drop ` - <source>` suffix), switch
  `token_sort_ratio` → `token_set_ratio`, keep SOURCE_PRIORITY tie-break.
- **Close the cross-cycle gap**: compare new titles against a sliding window
  (last ~3–7 days) pulled from SQLite, not just the current run. New storage helper
  returning recent `(link, title, published, story_group_id, scraped_content)`.
- Emit **candidate pairs** (≥~85) for Layer 2 — title fuzz must never decide alone
  (false positives on shared entities, e.g. "Governo aprova…").

### WS5 — Layer 2 body confirmer + `story_group_id` (union-find)  [effort: L]
- Confirmer choice (see open question): **start zero-dep** with trafilatura's
  built-in SimHash (`content_fingerprint` / `.similarity()`); upgrade to
  **scikit-learn TF-IDF cosine** (PT stopwords, ngram (1,2), refit over run+window,
  confirm ≥~0.6) if SimHash misses reworded republishes. (sentence-transformers
  is the heavy-but-most-accurate fallback; deferred — torch on Py3.9 is heavy.)
- New module `backend/dedup.py`: take WS4 candidates → confirm on body → union-find
  → assign `story_group_id`, seeding from existing group ids in the window so ids
  are **stable across runs**.
- Representative = highest SOURCE_PRIORITY / earliest published / longest body
  (open question); set `is_group_primary`, `story_group_size`.
- **Hook point**: confirmation needs bodies → run grouping **after** Stage B
  enrichment (tail of `enrich_pending_news` or the auto loop in `api.py`), not
  blocking Stage A. (Layer 1 candidate-flagging may still run in `collect_news`.)
- Expose group info in the `/api/news` response for the frontend (FE work separate).
- Risk: keep thresholds conservative — prefer two ungrouped rows over a wrong merge.

### WS6 — Layer 3 MiniMax tie-breaker  [DEFERRED, effort: S–M]
Only adjudicate the ambiguous middle band (e.g. body cosine 0.45–0.6) with a strict
yes/no "same underlying story?" prompt; capped per cycle, config-gated OFF by
default. Do NOT use MiniMax for bulk clustering — collides with the 3s rate limit.

### WS7 — Playwright JS/consent escalation  [DEFERRED, effort: M]
Only behind `is_truncated` AND after consent-cookie retry already failed; render →
hand HTML back to trafilatura. Do NOT bypass hard paywalls (Público, Expresso) —
accept RSS-summary fallback (ToS/copyright/GDPR). Build only if logs prove specific
sources need it.

## Sequencing

1. **WS1** — highest ROI, zero new deps; recovers verified DN/ECO full bodies.
2. **WS2** — ~5-line trafilatura retune + the `is_truncated` gate the chain needs.
3. **WS3** — tiny additive plumbing for dedup; can overlap WS2.
4. **WS4** — extends existing rapidfuzz dedup; closes cross-cycle gap; installed deps only.
5. **WS5** — the visible cross-source dedup feature; SimHash-first, sklearn if needed.
6. **WS6 / WS7** — deferred; build only if WS5/WS2 metrics prove the cheap layers miss.

## Open questions (need decisions)

1. ~~**Dedup UX**~~ — DECIDED: collapse to one card + "N sources" badge.
2. ~~**Confirmer dependency appetite**~~ — DECIDED: SimHash first, add sklearn TF-IDF only if needed.
3. **Group representative rule**: highest SOURCE_PRIORITY (but Público/Expresso are
   paywalled → may be teaser-only), earliest published, or longest body?
4. ~~**`content:encoded` storage**~~ — DECIDED: clean into `scraped_content` at Stage A, no column.
5. **Scrape vs LLM retry budgets**: give pure-scrape failures their own counter
   (so unscrapeable sites don't burn LLM attempts)? What ceiling?
6. **Re-scrape policy** for legacy/short `done` rows: admin-button only, or auto sweep?
7. **Cross-cycle window**: 3 vs 7 days (longer catches slow republishers, more
   false-merge surface + DB reads).
8. **Playwright deployable** in target env at all (RAM/browser install)? Decides WS7.
