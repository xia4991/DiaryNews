# Plan: Frontend Redesign — Porcelain Blue (2026-04-17)

Branch: `Design-Porcelain`

## Direction

Light theme, warm porcelain background (`#F5F3EE`), muted azulejo blue (`#2B6CB0`) as the single accent. Voice: a daily reading room — warm, editorial, modern. Refactor the whole frontend onto a real token system + shared UI primitives.

Full spec: `/Users/yongbinjiang/.claude/plans/compiled-shimmying-spindle.md`.

## Sequential tasks

Each task ends with a browser walkthrough and waits for confirmation before the next.

1. **Tokens + fonts** — rewrite `src/index.css` and `index.html` font links. Swap dark-theme `@theme` block for Porcelain Blue tokens (semantic names: `bg`, `surface`, `text`, `text-muted`, `border`, `accent`, etc.). Remove `class="dark"` from `<html>`. Smoke test: `npm run build` plus dev server loads with the old components rendering against new tokens (will look broken — that's expected).

2. **UI primitives** — add `src/components/ui/{Card, Button, Badge, Modal, Field, SectionHeader, SkeletonCard}.jsx`. Built against tokens. Include a tiny `src/pages/_PreviewUI.jsx` route or a dev-only panel to verify each primitive in isolation.

3. **AppShell + Header** — extract `AppShell.jsx` from `App.jsx`. Migrate `Header.jsx` to the new tab underline + avatar menu design. `App.jsx` shrinks to state + routing.

4. **Sidebars** — migrate `Sidebar.jsx`, `CnSidebar.jsx`, `YoutubeSidebar.jsx`, `JobsSidebar.jsx`, `SidebarShell.jsx` to tokens + `Badge` for counts.

5. **News** — rebuild `NewsTab.jsx`, `ArticleCard.jsx`, `ArticleCardFeatured.jsx`, `ArticleModal.jsx` on `Card` + `Modal` + `Badge` + `SectionHeader`.

6. **YouTube** — rebuild `YoutubeTab.jsx`, `VideoFeedItem.jsx`, `VideoModal.jsx`, `ChannelManager.jsx`.

7. **Jobs + Ideas** — rebuild `JobsTab.jsx`, `JobCard.jsx`, `JobDetailModal.jsx`, `JobFormModal.jsx`, `IdeasTab.jsx`, `IdeaModal.jsx`.

8. **Auth + Profile + Toast** — rebuild `LoginPage.jsx`, `ProfileModal.jsx`, `Toast.jsx`.

9. **Sweep** — grep for stray `#hex` / `rgba(` / hard-coded font names; fix any stragglers. Retire the `_PreviewUI` scratch page.

10. **Merge** — squash-merge `Design-Porcelain` into `main` once all tabs verified on mobile + desktop.

## Verification checklist (done at end of each task)

- Dev server renders without console errors.
- Mobile (iPhone 12 width), tablet, desktop walkthrough.
- No leftover dark-theme hex values inside the migrated files.
- Keyboard focus rings visible on all focusable elements.
- Bilingual text (CJK + Latin) shows consistent baseline and no fallback glyphs.
