# Remove YouTube Functionality Plan

Date: 2026-04-18

## Goal

Completely remove YouTube-related functionality from the DiaryNews project. Project objectives have shifted and YouTube surfaces are no longer in scope. Remove code, API surface, data tables, and documentation references.

## Scope Inventory

Backend:
- `backend/youtube.py` (channel resolution, Atom feed, caption extraction)
- `backend/storage/youtube.py` (channels/videos/captions CRUD)
- `backend/api.py` — 8 YouTube endpoints
- `backend/services.py` — YouTube channel/video/caption orchestration
- `backend/storage/__init__.py` — re-exports
- `backend/storage/migration.py` — legacy JSON migration block
- `backend/database.py` — `channels`, `videos`, `captions` tables + indices
- `requirements.txt` — `youtube-transcript-api`, `yt-dlp`

Frontend:
- `react-frontend/src/pages/YoutubeTab.jsx`
- `react-frontend/src/components/youtube/` (4 components)
- `react-frontend/src/App.jsx` — tab, state, imports, sidebar branch
- `react-frontend/src/api.js` — 6 YouTube methods
- `react-frontend/src/pages/HomePage.jsx` — nav card, digest block, quick-action

Docs:
- `CLAUDE.md`, `AGENTS.md` — architecture bullets
- `README.md`
- `.claude/rules/backend.md`, `.claude/rules/frontend.md`

## Task 1 — Frontend removal

Delete YouTube page and components, strip YouTube from `App.jsx`, `api.js`, and `HomePage.jsx`. Verify `npm run build` succeeds.

## Task 2 — Backend code removal

Delete `backend/youtube.py` and `backend/storage/youtube.py`. Strip YouTube endpoints from `api.py`, YouTube orchestration from `services.py`, re-exports from `storage/__init__.py`, and legacy migration block from `storage/migration.py`. Verify `python -c "import backend.api"` succeeds.

## Task 3 — Database schema cleanup

Remove `channels`, `videos`, `captions` CREATE TABLE statements and related indices from `backend/database.py`. Add a one-time DROP TABLE migration so existing DBs shed the tables. Keep tables gone from schema init going forward.

## Task 4 — Dependency cleanup

Remove `youtube-transcript-api` and `yt-dlp` from `requirements.txt`.

## Task 5 — Docs refresh

Update `CLAUDE.md`, `AGENTS.md`, `README.md`, `.claude/rules/backend.md`, and `.claude/rules/frontend.md` to drop YouTube mentions. Leave historical `dev-log/` entries intact.

## Validation

- `cd react-frontend && npm run build`
- `source .venv/bin/activate && python -c "from backend import api, services, storage"`
- Start backend + frontend, confirm app loads, Home/News/Jobs/Ideas tabs work, no YouTube artifacts visible.
