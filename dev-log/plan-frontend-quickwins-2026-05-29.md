# Frontend Quick Wins (vs API review)

From a frontend-vs-API review (workflow `frontend-review-vs-api`). These are the
high-value / low-effort items. Do **one at a time**, show result, confirm, then next.

Theme: the backend already serves data the UI throws away — surfacing it is the best ROI.

## Tasks (in order)

1. **[done] N-source badge + relevance_reason + author** — surface the just-shipped dedup
   + LLM relevance. `story_group_size>1` → "N 家媒体报道" badge on cards; modal lists
   `story_group_sources`; 华人关注 cards/modal show `relevance_reason` as "为什么相关";
   modal meta shows `author` when present. Pure presentation over existing fields.
   Files: `components/news/ArticleCard.jsx`, `ArticleCardFeatured.jsx`, `ArticleModal.jsx`.
2. **[done] Code splitting (React.lazy)** — wrap gated/heavy tabs (Admin, AIAssistant,
   Community, Jobs/RealEstate/SecondHand) in `React.lazy` + `<Suspense>` in `App.jsx`.
   502KB single bundle → admin console no longer shipped to anonymous visitors.
3. **[done] Card keyboard/SR accessibility** — `Card.jsx`: when `interactive`/`onClick`,
   add `role="button"`, `tabIndex=0`, `onKeyDown` (Enter/Space). Fixes WCAG 2.1.1 across
   every feed. One change,全站生效.
4. **[done] Client-side search** — wire the dead `Header.jsx` search box (or a NewsTab
   input) to filter the in-memory feed over `title_zh/title/summary_zh/content_zh/
   tags_zh/source`; make it reachable on mobile. No backend change.
5. **[done] 华人关注 source filter** — pass sources + activeSource into `CnSidebar`,
   include `source` in `filteredCnArticles`. Reuse the proven Portugal pattern.
6. **[done] Collapse 葡语原文 in ArticleModal** — put the full Portuguese
   `scraped_content` behind a "展开葡语原文" toggle; lead with `content_zh`.
7. **[done] React.memo on list cards** — wrap `ArticleCard`/`JobCard`/`RealEstateCard`/
   `SecondHandCard` so sibling state (sort/filter/modal) doesn't re-render the grid.
   (Pairs well with #1 since cards get heavier.)

## Out of scope (logged for later — bigger bets)

Mobile filter drawer; article `image_url` thumbnails/hero + lazy-load/onError; initial
loading skeleton + fix misleading empty state; error boundaries + retry; `/api/news`
backend pagination/filtering; homepage daily-brief card; related-stories in modal;
`useListings` hook + fetch caching; modal focus management. Defer/skip: filter-state
persistence, YouTube (being removed).

## Notes

- Backend crawler work (WS1–WS5, full-content + dedup) is also uncommitted in the tree.
- No linter/tests configured; verify by building (`npm run build`) + reading the diff.
