# T-FND-06 — Shared Frontend Listing Components

Date: 2026-04-18

## Goal

Build reusable listing components that Real Estate (Phase 2) and Second-Hand (Phase 3) will consume. Extract patterns currently hardcoded in `JobFormModal.jsx` into shared modules.

## Context

- Upload endpoint `POST /api/media/upload` already exists (T-FND-03)
- `api.js` is missing an `uploadMedia` method — need to add it
- `JobFormModal.jsx` has inline contact fields and form structure — extract for reuse
- Jobs don't use images, but RealEstate and SecondHand will

## Task 1 — Add `uploadMedia` to `api.js`

Add `uploadMedia(file)` method using multipart `FormData` with increased timeout for large images.

## Task 2 — `ContactFields.jsx`

Extract phone/WhatsApp/email contact block from `JobFormModal.jsx` into a standalone component. Props: `values`, `onChange`, `error`. Refactor `JobFormModal.jsx` to use it.

## Task 3 — `ImageUploader.jsx`

Drag/drop + click-select image upload component. Features:
- Calls `api.uploadMedia` per file
- Shows thumbnail previews with loading state
- Allows reorder (drag) and delete before submit
- Enforces max count (e.g. 8 images)
- Returns array of `{ storage_key, thumb_key, url, thumb_url }` objects

## Task 4 — `PhotoCarousel.jsx`

Image carousel for listing detail modals. Features:
- Left/right arrows, dot indicators
- Click to expand full-size
- Mobile-friendly swipe (optional, CSS-based)
- Accepts array of `{ url, thumb_url }` objects

## Task 5 — `ListingForm.jsx`

Shared form shell wrapping `Modal` with common fields (title, description, location, contact) and a `children` slot for kind-specific fields (industry/salary for jobs, deal_type/price for realestate, etc.). Handles submit, validation, and error display. Refactor `JobFormModal.jsx` to use it.

## Validation

- `npm run build` passes
- `JobFormModal` still works identically (refactor, not rewrite)
- Each new component can be visually verified in the Jobs flow or standalone
