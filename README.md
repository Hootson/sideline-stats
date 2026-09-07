# Sideline Stats V4.5.2 — Offline Snap Tracker

## V4.5.2 changes
- Snap Tracker invitations last 48 hours and reopening the invite extends the same active link.
- After the first successful load, the helper's browser stores the game, roster, progress totals, selections, and pending snap queue locally.
- The Snap Tracker page now registers the offline service worker itself and reopens from cache when the field has no service.
- The helper can wait for the visible **Offline ready** confirmation before leaving Wi-Fi or closing the page.
- Offline snaps update the saved progress immediately and upload in order when connectivity returns.
- Server validation errors disable recording; genuine network failures retain the usable offline copy.

## V4.5.1 changes
- Snap invitations now open a link preview with separate **Share Link** and **Copy Link** buttons.
- The second, direct tap preserves the browser's required user activation and prevents iPhone `NotAllowedError` permission messages.
- Link creation is temporarily disabled while the cloud invitation is prepared, preventing accidental duplicate requests.

## V4.5.0 changes
- The restricted Snap Tracker link now mirrors the in-app player progress bars, minimum status, and player-snap summary.
- Each team can set its league snap minimum from 1–100 in Edit Team; existing teams default to 10.
- The snap minimum syncs through Supabase and is included automatically in team backups.
- Invite links work in current Android and iPhone browsers without an account or app installation.
- Reopening Invite Snap Tracker reuses the active unexpired game link instead of invalidating a link that was already shared.

## V4.4.9 changes
- A returning connected device checks the cloud fingerprint before scheduling any local sync.
- When Supabase is newer and the phone has no pending local changes, the app loads the cloud copy first.
- This prevents an older locally cached game from overwriting newer backend corrections at startup.

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
