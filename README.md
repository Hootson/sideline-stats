V4.4.3 — Device hydration UI fix

Built from the complete V4.4.2 deployment. Fixes the second-device state where cloud linkage exists but local team/game data has not yet been hydrated. The UI now exposes Load Cloud Team and does not falsely report Cloud synced.

# Sideline Stats V4.4.2 — Step 4.5 Multi-Device Hardening

Adds safe ongoing cloud refresh/reconciliation on top of V4.3.0.

- Linked devices can manually **Refresh Cloud** to pull the latest team, roster, games, plays, credits, penalties and snap data.
- The app checks for newer cloud changes approximately every 30 seconds while online and surfaces **Cloud has updates / Load Updates** instead of silently overwriting the device.
- A cloud pull is blocked while local changes are still pending, protecting offline sideline work from accidental replacement.
- Refresh preserves the active game when the same cloud game still exists.
- After a refresh, cloud UUIDs remain the canonical local IDs and sync hashes are rebuilt to prevent duplicate uploads.
- Game-day recording remains local-first and does not depend on connectivity.

This is intentionally conservative conflict handling: remote changes are detected and offered to the user, but never auto-applied over unsynced local work.


## V4.4.2 hardening
- Cloud update detection now fingerprints team, roster, games, plays, credits, penalties, snaps, and snap participants instead of relying only on a few updated_at timestamps.
- Snap edits use soft replacement so participant changes reconcile safely without deleting immutable participant rows.
- Deleted local snap records deactivate their cloud event and are excluded from restore.


## V4.4.2 auth redirect fix
- Production account confirmation explicitly redirects to https://hootson.github.io/sideline-stats/.
- Local development continues to redirect to its local origin/path.
