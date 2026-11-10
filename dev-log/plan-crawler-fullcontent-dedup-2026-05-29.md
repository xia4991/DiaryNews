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

### WS3 — Schema + migration  [effort: S] — DONE 2026-05-29
- [done] `storage/database.py` `_migrate`: added `content_hash TEXT DEFAULT ''`,
  `story_group_id TEXT DEFAULT ''`, `story_group_size INTEGER NOT NULL DEFAULT 0`,
  `is_group_primary INTEGER NOT NULL DEFAULT 0` (additive ALTER, try/except pattern).
  Followed the established convention (newer cols live in `_migrate`, not the
  CREATE TABLE DDL). Kept `content_hash` separate from the unused
  `enrichment_input_hash` (different semantics).
- [done] `init_db`: added `idx_articles_story_group` + `idx_articles_content_hash`
  after `_migrate` (they reference migrated columns).
- [done] `storage/news.py` `_bulk_upsert_articles`: threaded **only** `content_hash`
  (INSERT col + VALUES bind + dict + ON CONFLICT preserve-on-empty). Decision:
  `story_group_id`/`size`/`primary` are intentionally **excluded** — new rows get the
  column DEFAULT and the WS5 grouping pass owns them via its own UPDATE, so Stage A/B
  can never disturb a group assignment (also less desync risk in the big statement).
- [done] Verified on a 2491-row copy of the live DB: all 4 columns + both indexes
  created; row count intact (2491→2491); migration idempotent; `content_hash`
  round-trips and survives an empty Stage-A re-upsert. Live DB migrates automatically
  on next app start (additive + idempotent).

### WS4 — Layer 0+1 data foundations  [effort: M] — DONE 2026-05-29 (scope refined)
Window = **2 days** (user choice). WS4 lays the dedup data foundations with **no risky
behavior change**; the `token_set_ratio` switch + "keep & group instead of drop" move
to WS5, where the body-confirm safety net prevents over-dropping in Stage A.
- [done] `news.py` `compute_content_hash(text)`: SHA-256 of whitespace-collapsed,
  lowercased body; `''` for empty (preserve-on-empty safe). Wired into **both** Stage B
  save sites (single `enrich_pending_news` + batch `_run_batch_enrichment`).
- [done] `crawler/parsing.py` `normalize_title(title, source)`: lowercase + accent-strip
  (`unicodedata`) + trailing ` - <source>`/`|`/`–`/`—` suffix removal + punctuation→space.
- [done] `deduplicate` now compares **normalized** titles (still `token_sort_ratio>70`,
  still hard-drop + SOURCE_PRIORITY tie-break) — a safe quality bump, no over-drop risk.
- [done] `storage/news.py` `list_recent_articles_for_dedup(days=2)`: returns recent
  `(link, title, source, published, story_group_id, content_hash, scraped_content,
  summary)` for the cross-cycle window — ready for WS5.
- [done] Verified: modules compile; `compute_content_hash` whitespace/case-insensitive +
  empty→''; `normalize_title` strips accents/suffix (only when suffix matches source);
  `deduplicate` 3→2 keeping the higher-priority dup + the distinct story; window helper
  returned 968 rows over a DB copy with the right fields.
- **Deferred to WS5** (need the body safety net first): `token_set_ratio` switch,
  cross-cycle **candidate-pair emission**, and relaxing the Stage-A hard-drop so
  cross-source dups are retained + grouped (required for the "N sources" UX).

Decision (user): confirmer = trafilatura SimHash first; representative = **earliest
published**. WS5 split into WS5a (grouping engine — data only) and WS5b (surface it).

### WS5a — Grouping engine + `story_group_id`  [effort: L] — DONE 2026-05-29
- [done] `backend/dedup.py`: title pre-filter (`token_set_ratio` ≥ 85 on normalized
  titles, day-bucketed) → confirm (`content_hash` exact, else trafilatura
  `Simhash.similarity` ≥ 0.80, else stricter title ≥ 92 when a body is missing) →
  union-find → stable `story_group_id` (`sg_<sha>` minted from the earliest member's
  link, or reuse an existing id in the component). Representative = earliest published.
  Conservative thresholds (constants, tunable).
- [done] `storage/news.py` `assign_story_groups(assignments)` — UPDATEs only the
  grouping columns, never enriched content. Re-exported from `backend.storage`.
- [done] `services.py` `regroup_recent_stories(days=2)` — loads the window, groups,
  persists, **and clears** stale groups for rows that no longer match. Hooked at the
  tail of `enrich_pending_news` (after save), wrapped so it never breaks enrichment.
- [done] Verified on a copy of the real DB (7-day window): 2271 → 224 grouped into 104
  groups; **idempotent** (group ids stable across re-runs); spot-checked groups are
  correct cross-source dups (e.g. "Prestação Social Única" across 5 distinct sources;
  "Polícia turca…" across 4). Known mild false-merge: same-source serial bulletins
  ("As notícias das 3h/4h/6h") merge via overlapping bodies — tunable, arguably benign.
- SimHash API note: it's `trafilatura.deduplication.Simhash(text).similarity(other)`
  (NOT `content_fingerprint`, which the research mis-named). sklearn TF-IDF upgrade
  still available if SimHash proves to miss reworded republishes.

### WS5b — Surface it: relax Stage-A drop + collapse the feed  [effort: M] — DONE 2026-05-29
- [done] `crawler/parsing.deduplicate` now drops only **same-source** near-identicals
  (same source + same day + token_sort>70); cross-source dups are retained for grouping.
- [done] `storage/news.py` `load_news_feed()` + `_collapse_story_groups()`: collapses by
  `story_group_id` to one card at the most-recent member's position, content from the
  earliest-published representative, adding `story_group_size` + distinct
  `story_group_sources`. Raw `load_news()` left untouched.
- [done] Re-exported `load_news_feed`; `GET /api/news` now returns the collapsed feed.
- [done] Verified on a DB copy: `deduplicate` keeps cross-source / drops same-source;
  raw feed 2492 → collapsed 2373 (119 folded); a 5-member group shows as 1 card with
  size=5 + sources=[Expresso, Observador, RTP, SIC]; feed links ⊆ raw, and `load_news()`
  still returns all 2492 so `collect_news`'s existing-URL set is unaffected.
- Frontend badge ("N 来源") is now a graceful enhancement — server already collapses;
  it can read `story_group_size` / `story_group_sources`.

### WS6 — Layer 3 MiniMax tie-breaker  [DEFERRED, effort: S–M]
Only adjudicate the ambiguous middle band (e.g. body cosine 0.45–0.6) with a strict
yes/no "same underlying story?" prompt; capped per cycle, config-gated OFF by
default. Do NOT use MiniMax for bulk clustering — collides with the 3s rate limit.

### WS7 — Playwright JS/consent escalation  [DEFERRED, effort: M]
Only behind `is_truncated` AND after consent-cookie retry already failed; render →
hand HTML back to trafilatura. Do NOT bypass hard paywalls (Público, Expresso) —
accept RSS-summary fallback (ToS/copyright/GDPR). Build only if logs prove specific
sources need it.

## Status (2026-05-29)

- ✅ **WS1–WS5 DONE** — Track A (content robustness) + Track B (cross-source dedup),
  both ends shipped server-side. All verified against the live feeds / a copy of the
  real DB. Nothing committed — changes are in the working tree.
- ⏭️ **WS6 / WS7 deferred** — build only if logs/metrics prove the cheap layers miss.
- 🔜 **Frontend** (separate): render the "N 来源" badge from `story_group_size` /
  `story_group_sources`; otherwise the collapsed feed already works.
- 🔧 **Tuning knobs** if needed: `dedup.TITLE_CANDIDATE_THRESHOLD` (85),
  `BODY_SIMILARITY_THRESHOLD` (0.80), `TITLE_ONLY_CONFIRM_THRESHOLD` (92),
  `news.TRUNCATION_MIN_WORDS` (120), `config.RSS_FULLTEXT_MIN_WORDS` (250),
  window `days=2`.

## Sequencing (as executed)

1. **WS1** ✅ — recovered verified DN/ECO full bodies (content:encoded), zero new deps.
2. **WS2** ✅ — trafilatura retune (`favor_recall`) + `is_truncated` escalation chain.
3. **WS3** ✅ — additive schema/migration for dedup columns + indexes.
4. **WS4** ✅ — content_hash + normalized-title dedup + 2-day window helper.
5. **WS5a/b** ✅ — SimHash grouping engine + feed collapse with "N sources".
6. **WS6 / WS7** — deferred.

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
