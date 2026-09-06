# Sideline Stats V4.4.9 — Safe Cloud Backup Restore

## V4.4.9 changes
- Restoring a backup while signed into the connected Erie team preserves the existing Supabase team and season IDs.
- Backup roster players and games are reconciled to existing cloud records by jersey/name and week/opponent.
- The restored backup becomes the local source of truth and syncs immediately to Supabase without creating a duplicate Erie team.
- Only a resolved statkeeper account can perform a connected cloud restore.

## Earlier V4.4.8 changes
- Supabase Auth sessions persist on each device and refresh automatically.
- The selected cloud team is remembered per signed-in user on that device.
- Returning users reopen their locally cached team immediately, including offline.
- A signed-in user with no local team automatically loads the remembered cloud team (or their only cloud team).
- Account Settings now includes **Switch Team** and device-only **Sign Out**.

## Earlier V4.4.5 fixes

## V4.4.5 fixes
- Connected secondary devices automatically check Supabase every 30 seconds and apply remote changes when there are no unsynced local changes.
- Manual **Refresh Cloud** remains as a fallback, but normal viewers/coaches should not need to tap it.
- Auto-refresh preserves the screen the viewer is currently watching instead of jumping back to Team Setup.
- Auto-refresh is blocked whenever the device has pending local changes, preventing stale-device overwrites.
- Cloud fingerprint loading now includes the team's `updated_at`, so the loaded snapshot and the 30-second remote check compare the same fields.
- Service worker cache bumped to V4.4.5.
