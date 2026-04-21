# Plan: Review Findings Fixes

Date: 2026-04-21

## Goal

Fix the concrete findings from the project review on an isolated git branch without disturbing existing unrelated local changes.

## Tasks

1. Lock down backend security gaps
   - Protect `/api/chat/admin/reindex-wiki` with admin auth
   - Scope chat conversations/messages so users cannot access each other's data
   - Fail fast when Google auth audience configuration is missing

2. Fix frontend correctness issues
   - Resolve the conditional hook usage in `react-frontend/src/pages/NewsTab.jsx`
   - Resolve the `setState`-in-effect issue in `react-frontend/src/components/CookieConsent.jsx`

3. Reduce immediate backend performance risks
   - Remove the listing image N+1 query pattern in list endpoints

4. Verify
   - Run frontend lint
   - Run focused sanity checks for the modified backend paths

## Notes

- Current worktree is already dirty (`data/diarynews.db-shm`); do not modify or revert it.
- Keep changes limited to the reviewed findings and direct supporting code only.
