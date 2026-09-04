# Sideline Stats V4.4.3 — Step 4.5 Multi-Device Sync Fix

This patch fixes issues found in the first real two-device test.

## V4.4.3 fixes
- Cloud restore now refreshes the actual interface after loading: team fields, header, navigation, roster, game, snaps, and stats.
- Removes calls to nonexistent `renderSetup()` and `updateNav()` that caused the restore flow to stop after data had already been saved locally.
- A device with cloud IDs but no loaded local team is no longer treated as fully linked; `Load Cloud Team` remains available.
- Fixes a phantom pending-play loop caused by cloud-only revision metadata changing the play hash after an edit.
- Existing V4.4.2 hash state is safely rebased locally on upgrade when there is no sync error, avoiding unnecessary rewrites of already-synced Week 2 data.
- Cloud status now identifies the first pending item(s), e.g. play, stat credit, penalty, snap, game state, or deletion.
- Includes a V4.4.3 service worker/cache file so GitHub deployments update cleanly.

## V4.4.2 hardening
- Cloud update detection now fingerprints team, roster, games, plays, credits, penalties, snaps, and snap participants instead of relying only on a few updated_at timestamps.
- Snap edits use soft replacement so participant changes reconcile safely without deleting immutable participant rows.
- Deleted local snap records deactivate their cloud event and are excluded from restore.


## V4.4.2 auth redirect fix
- Production account confirmation explicitly redirects to https://hootson.github.io/sideline-stats/.
- Local development continues to redirect to its local origin/path.
