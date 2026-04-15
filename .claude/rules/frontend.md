---
paths:
  - "react-frontend/src/**/*.{jsx,js,css}"
  - "react-frontend/package.json"
  - "react-frontend/vite.config.js"
---

# Frontend Rules

## Component Hierarchy

```
App.jsx (state, tabs, filtering)
  Header.jsx (tab nav, fetch button)
  Sidebar.jsx (news category filter)
  CnSidebar.jsx (Chinese-interest tags + category filter)
  YoutubeSidebar.jsx (channel/category filter)
  NewsTab.jsx (article grid — reused for both news tabs)
    ArticleCardFeatured.jsx (first article, large)
    ArticleCard.jsx (regular cards)
    ArticleModal.jsx (detail overlay)
  YoutubeTab.jsx / IdeasTab.jsx
```

## Tab System

4 tabs: `华人关注` (default), `葡萄牙新闻`, `YouTube`, `Ideas`
- Both news tabs share the same data source (`articles` state) and `<NewsTab>` component
- `华人关注` filters to articles with non-empty `tags_zh`
- Tab switching resets all filters (`activeCategory`, `activeCnTag`, `ytFilter`)

## Chinese Translation Pattern

Portuguese category names come from the backend. Frontend translates them for display using a shared `CATEGORY_ZH` map duplicated in each component that needs it:

```js
const CATEGORY_ZH = {
  'Politica': '政治', 'Desporto': '体育', 'Economia': '经济', ...
}
```

Components using this: `Sidebar.jsx`, `CnSidebar.jsx`, `ArticleCard.jsx`, `ArticleCardFeatured.jsx`, `ArticleModal.jsx`

## Styling

- Tailwind CSS 4 + inline styles for dark theme
- Dark background: `#0b1326`, card: `#131b2e`, text: `#dae2fd`
- Material Symbols Outlined icons (loaded via Google Fonts)
- Category badges: color-coded by `CATEGORY_COLORS` map
- Chinese-interest tags: amber color (`#ffb74d`)

## API Client

`api.js` wraps all `/api/*` endpoints via Axios. Base URL: `/api` (Vite proxies to port 8000).
