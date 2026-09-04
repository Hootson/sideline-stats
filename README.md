# Sideline Stats V4.4.5 — Live Auto-Refresh

## V4.4.5 fixes
- Connected secondary devices automatically check Supabase every 30 seconds and apply remote changes when there are no unsynced local changes.
- Manual **Refresh Cloud** remains as a fallback, but normal viewers/coaches should not need to tap it.
- Auto-refresh preserves the screen the viewer is currently watching instead of jumping back to Team Setup.
- Auto-refresh is blocked whenever the device has pending local changes, preventing stale-device overwrites.
- Cloud fingerprint loading now includes the team's `updated_at`, so the loaded snapshot and the 30-second remote check compare the same fields.
- Service worker cache bumped to V4.4.5.
