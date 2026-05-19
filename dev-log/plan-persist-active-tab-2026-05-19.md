# Persist Active Tab on Refresh

## Summary

Keep the current frontend page after browser refresh by storing the active tab in localStorage and restoring it during app initialization. Existing auth guards continue to redirect protected tabs when the user is not allowed to view them.

## Tasks

1. Add a storage key and safe active-tab reader in `App.jsx`.
2. Initialize `activeTab` from storage instead of always using `首页`.
3. Persist `activeTab` whenever it changes.
4. Build the frontend to verify the change.
