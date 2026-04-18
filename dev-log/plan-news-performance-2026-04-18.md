# News Tab Performance Plan

Date: 2026-04-18

## Goal

Reduce perceived latency when switching to `华人关注` and `葡萄牙新闻`.

## Findings

- Local article volume is currently high enough to make full-list rendering expensive.
- `NewsTab` currently renders almost the entire article list in one pass.
- Category/tag derivations are recomputed during render for the news tabs.

## Planned changes

- Limit initial article rendering in `NewsTab`
- Add a progressive `load more` interaction for deeper browsing
- Memoize heavy derived article computations in `App.jsx` and `NewsTab.jsx`
- Keep existing data and visual structure intact

## Validation

- Run frontend build
- Run frontend lint if the touched files remain clean within the current repo state
