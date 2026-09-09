# Sideline Stats V4.5.12 — Play-Call Tracking

## V4.5.12 changes
- Adds an optional offensive playbook with a play number and name.
- The statkeeper can attach a play call to the next rush or pass; its saved snapshot remains available for future coach analytics.
- Viewer accounts open the newest Live game first and fall back to the newest completed game when no game is Live.
- Voice field positions recognize “are” as “our” and “there/they’re” as “their” when followed by a yard line.
- The Snaps layout stacks jersey number over player name and narrows the progress area to prevent phone-screen overlap.

## V4.5.11 changes
- Adds a deterministic lookup table connecting every digit from 0–99 to its full English spelling.
- Spoken jersey numbers are converted to digits before the app searches the roster, including phrases such as “number four,” “jersey eighteen,” and “number twenty four.”
- Common speech-to-text variants such as “for” for four and “too” for two are also normalized when used after number, jersey, or #.
- “Pass from number four” is correctly treated as identifying the passer, not as introducing a starting field position.
- Manual defensive entry collects tackle, turnover, and scoring details before asking for the ending field position and calculating yardage.
- Deleting a cloud-connected game now archives it in Supabase and removes it from statkeeper and viewer game lists on the next automatic sync.
- Viewer live refreshes retain changes that arrive during another refresh and reconnect automatically after a Realtime interruption.
- The Snaps screen now includes a direct minimum-setting control plus each player’s current-game snap percentage and `player snaps / total snaps` count.

## V4.5.10 changes
- Voice listening now continues through thinking pauses until the statkeeper taps **Stop & Transcribe**, with a 30-second safety stop.
- Jersey references recognize digits, spelled-out numbers, and common speech-to-text number variants.
- A one-word transcript correction made before **Check Wording** is remembered locally for that team, including corrections such as “Babe” → “Abe.”
- Opening a finalized game now offers to resume it and mark it Live; finalizing a game has clearer wording and requires confirmation.

## V4.5.9 changes
- Starts from the stable V4.5.7 Viewer Game Center release.
- Manual offense and defense entry can calculate yardage from a drive's starting spot and the play's ending spot.
- The ending spot automatically becomes the next play's starting spot; a new drive asks when its starting position is unknown.
- Field sides use the team and opponent names, with midfield and end-zone choices plus a direct-yardage fallback.
- Voice entry understands field positions, offense and basic defense, jersey numbers, and fuzzy roster matching such as “Babe” → “Abe.”
- Every voice play shows a confirmation before it is recorded.

## V4.5.7 changes
- Viewer accounts now open directly to a read-only Game Center showing the newest game's scoreboard, quarter, possession, down and distance, and full statistics.
- Viewers can select previous games and share stats, while Roster, Game, Snaps, team editing, and analytics export controls are unavailable.
- Role-based routing prevents an old navigation action from opening a statkeeping screen. The layout is ready for a separate Coach Analytics destination in a future version.

## V4.5.6 changes
- Viewer accounts keep the instant Supabase live subscription and also perform a lightweight game-revision check every three seconds while the page is visible.
- A missed or delayed mobile-browser live event now causes the viewer screen to reload the cloud game automatically without a pull-to-refresh.
- Returning to the viewer page or reconnecting to the internet triggers an immediate revision check on iPhone and Android.

## V4.5.5 fix

- Every cloud load now rechecks the signed-in team membership, preventing an owner/statkeeper phone from remaining mislabeled as a viewer.
- A local change made while the role is temporarily unknown triggers a role check and uploads automatically once statkeeper access is confirmed.
- **Refresh Cloud** becomes **Retry Sync** when a statkeeper has pending local changes, providing a safe upload retry without replacing the phone's copy.

## V4.5.4 fix
- A change made while another cloud sync is still running now queues an immediate follow-up sync instead of remaining pending.
- This specifically fixes a newly created game getting stuck at **Cloud connected — 1 pending** during startup.

## V4.5.3 changes
- A connected statkeeper publishes completed play updates to Supabase after the full play, credits, penalties, and game state are stored.
- Signed-in free/view-only team members receive near-real-time score, play log, player-stat, penalty, roster, and snap updates without tapping Refresh Cloud.
- Unchanged team and roster records are skipped during game sync, reducing the work and network time required after each play.
- The active game syncs first; the existing 15-second cloud check remains as a fallback if a live event is missed.
- The Account status reads **Live updates on** when a viewer's Realtime connection is active.

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
