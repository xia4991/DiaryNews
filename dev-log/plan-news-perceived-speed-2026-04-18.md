# News Perceived Speed Plan

Date: 2026-04-18

## Goal

Improve the perceived smoothness when switching into `华人关注` and `葡萄牙新闻`.

## Planned changes

- Add a lightweight skeleton state for news-tab entry
- Keep the delay short so it feels smooth rather than blocked
- Add subtle content-enter motion for the news view
- Preserve the earlier real rendering optimizations

## Validation

- Run frontend lint
- Run frontend build
- Manually verify tab switching feels smoother
