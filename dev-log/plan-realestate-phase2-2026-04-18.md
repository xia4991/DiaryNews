# Phase 2 — Real Estate

Date: 2026-04-18

## Goal

Add a Real Estate module (rent/sale) to the platform, mirroring the Jobs pattern with the addition of images and price-centric UI.

## Task 1 — T-RE-01: Schema + storage

- Add `listing_realestate` table to `database.py`
- Register in `_EXTENSION_TABLES` in `listings.py`
- Add `create_realestate`, `update_realestate`, `list_realestate` helpers
- Re-export from `storage/__init__.py`

## Task 2 — T-RE-02: API endpoints

- `GET /api/realestate` (public) with filters: `deal_type`, `min_price_cents`, `max_price_cents`, `location`, `min_rooms`
- `GET /api/realestate/{id}` (public)
- `POST /api/realestate` (login required, with image_keys)
- `PUT /api/realestate/{id}` (owner or admin)
- `DELETE /api/realestate/{id}` (owner or admin)

## Task 3 — T-RE-03: Frontend tab

- `RealEstateTab.jsx` — page with hero, listings grid, sidebar panel
- `RealEstateCard.jsx` — price-dominant card with thumbnail
- `RealEstateDetailModal.jsx` — full detail with PhotoCarousel
- `RealEstateFormModal.jsx` — uses ListingForm + ImageUploader
- Add constants: `DEAL_TYPE_ZH`, colors
- Wire into `App.jsx` with tab, sidebar, api methods

## Task 4 — T-RE-04: Filter sidebar

- `RealEstateSidebar.jsx` — sale/rent toggle, rooms dropdown, location text
- Wire into App.jsx sidebar logic

## Validation

- `npm run build`
- Backend import check
- CRUD round-trip for realestate listings
