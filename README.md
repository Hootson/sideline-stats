# Sideline Stats V2.0 — Test Roster Fix

Fixes the first-time setup bug introduced in V1.9.

The fake 20-player test roster now loads only AFTER a team has been created.

Flow:
1. Create team
2. Save team
3. Test roster is added automatically if roster is empty
4. App moves to Roster screen normally

Existing rosters are never overwritten.

## GitHub
Replace `index.html` and `manifest.webmanifest` in the same repository and commit to `main`.
