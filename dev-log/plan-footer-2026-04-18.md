# Footer Plan

Date: 2026-04-18

## Goal

Add a proper site footer so the platform feels complete and trustworthy, with:

- platform identity
- key navigation shortcuts
- support / legal information blocks
- copyright line

## Why Now

The product is no longer a simple tool page. It now has multiple first-class sections:

- 首页
- 华人关注
- 葡萄牙新闻
- 招聘
- 房产
- 二手
- 社区
- Ideas

Without a footer, pages end abruptly and the platform feels less finished than the rest of the redesign work.

## Scope

### Included

- shared footer component
- platform intro block
- major channel shortcuts
- support information block
- legal information block
- copyright row

### Excluded

- dedicated legal pages
- real contact form
- full sitemap
- mobile-specific footer redesign beyond responsive layout

## Tasks

1. `T-FOOT-01` Create shared footer component and mount it in the app shell
2. `T-FOOT-02` Refine footer content and spacing after seeing it in the live layout

## Progress

Completed:

1. `T-FOOT-01` Shared footer component and shell integration
2. `T-FOOT-02` Footer visual polish: softer palette, improved spacing, stronger brand block, cleaner copyright row
3. `T-FOOT-03` Footer integration polish: smoother page-to-footer transition and mobile-safe bottom spacing
4. `T-FOOT-04` Homepage ending polish: add a lighter closing section so homepage content transitions into the footer more naturally

## Content Direction

Recommended first version:

- Brand: `葡萄牙华人信息中心`
- Intro: `为在葡华人提供新闻、招聘、房产、二手与社区交流的信息平台`
- Main channels:
  - 首页
  - 华人关注
  - 葡萄牙新闻
  - 招聘
  - 房产
  - 二手
  - 社区
- Support:
  - 联系与反馈
  - 帮助与说明
- Legal:
  - 隐私说明
  - 使用说明
  - 免责声明
- Copyright:
  - `© 2026 葡萄牙华人信息中心 版权所有`

## Implementation Note

Channel entries should be real in-app navigation where possible.

Support and legal items should initially be presentational only unless a real destination exists, to avoid misleading dead links.
