# Phase 3 — Second-Hand Marketplace

**Branch:** `SecondHand-Phase3`
**Date:** 2026-04-18

## Tasks

### T-SH-01 · SecondHand schema + storage
- `listing_secondhand` extension table: category, condition, price_cents
- Storage helpers: `create_secondhand`, `list_secondhand`, `update_secondhand`
- Categories: Electronics, Furniture, Clothing, Vehicle, Baby, Sports, Books, Other
- Conditions: new, like_new, good, fair

### T-SH-02 · SecondHand API endpoints
- `GET /api/secondhand` — list with filters (category, condition, price range, location)
- `GET /api/secondhand/{id}` — single item
- `POST /api/secondhand` — create (auth required)
- `PUT /api/secondhand/{id}` — update (owner/admin)
- `DELETE /api/secondhand/{id}` — soft delete (owner/admin)

### T-SH-03 · SecondHand frontend tab
- `SecondHandTab.jsx` — page with hero, stats, grid
- `SecondHandCard.jsx` — card with photo, price, condition badge
- `SecondHandDetailModal.jsx` — detail with PhotoCarousel, contact links
- `SecondHandFormModal.jsx` — form using ListingForm wrapper
- Constants file for category/condition labels, colors, icons

### T-SH-04 · SecondHand filters sidebar
- `SecondHandSidebar.jsx` — category filter with counts + condition filter
- Wire into App.jsx with state + sidebar branch
