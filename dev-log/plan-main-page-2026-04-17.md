# Main Page And Brand Refresh Plan

Date: 2026-04-17

## Goal

Introduce a real main page for the platform and update the visible product name from `DiaryNews` to `葡萄牙华人信息中心`.

## Task 1

Create a new main page in the React frontend that becomes the default entry view.

Planned scope:

- Add a dedicated `Home` page component
- Make `Home` the default active page
- Present platform overview, quick actions, and content previews
- Reuse existing news, jobs, and YouTube data already loaded by the app
- Keep current domain pages intact

## Task 2

Refresh visible platform branding.

Planned scope:

- Update the header product name
- Update the login page title
- Update other obvious user-facing brand references in the frontend

## Task 3

Adjust navigation and layout so the new main page fits naturally.

Planned scope:

- Add `首页` to top-level navigation
- Suppress sidebars on the new home page
- Keep existing fetch actions working from the header

## Task 4

Increase home page information density after first visual review.

Planned scope:

- Reduce the empty feel in the first screen
- Add a stronger featured content block to the left column
- Add a compact digest module so the page feels populated before scrolling
- Keep the new home page readable rather than turning it into a crowded dashboard

## Task 5

Upgrade the `华人关注` page into a more editorial signature page.

Planned scope:

- Keep existing article data, modal behavior, and filters
- Give `华人关注` its own top-of-page structure instead of the generic grid intro
- Add a stronger hero story and supporting quick-read area
- Preserve the standard `葡萄牙新闻` layout for now

## Task 6

Upgrade the `招聘` page into a clearer marketplace-style page.

Planned scope:

- Keep existing job data, modal behavior, and create/edit flow
- Add a stronger top section with overview and posting action
- Split highlighted jobs from the broader browse grid
- Make the page easier to scan without changing backend behavior

## Task 7

Upgrade the `葡萄牙新闻` page into a cleaner newsroom-style page.

Planned scope:

- Keep existing article data, modal behavior, and sidebar filters
- Add a stronger lead story and supporting headline area
- Add a compact newsroom overview using existing article/category data
- Preserve the new `华人关注` variant separately

## Validation

- Run frontend lint
- Run frontend build
- Manually verify the new home page renders as the default page
