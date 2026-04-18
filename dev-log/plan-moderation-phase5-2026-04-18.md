# Phase 5 — Moderation

**Branch:** `Moderation-Phase5`
**Date:** 2026-04-18

## Tasks

### T-MOD-01 · Admin moderation page
- Add `GET /api/admin/reports` endpoint (admin-only)
- Add `GET /api/admin/listings/recent` endpoint (admin-only, last 20 listings)
- Frontend API methods: `listReports`, `listRecentListings`, `setListingStatus`
- `AdminModerationTab.jsx`: two sections — unresolved reports + recent listings
- Reports show listing title, kind, reporter reason, quick actions (keep/hide/remove)
- Recent listings show kind, title, status, owner, with hide/remove actions
- Tab only visible when `user.is_admin`

### T-MOD-02 · Admin quick-hide on any listing detail
- Add admin action buttons to JobDetailModal, RealEstateDetailModal, SecondHandDetailModal
- When viewer is admin, show "管理" section with hide/remove dropdown
- Actions call `PATCH /api/admin/listings/{id}/status` directly
