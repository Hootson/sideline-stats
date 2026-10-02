# Sideline Stats V4.5.24 — Score Isolation

## V4.5.24 changes

- Prevents an opponent touchdown recorded through the Defense flow from also adding six points to the team's score.
- Keeps offensive touchdowns and defensive return touchdowns credited only to the correct team.
- Verifies that manually correcting the opponent score cannot alter the team's score.

## Previous release

## V4.5.23 changes

- Adds one-point run and one-point pass choices after a touchdown.
- Keeps the existing two-point kick, run and pass choices.
- Records the selected conversion value with the player attempt, result and awarded points.

## V4.5.22 changes

- Sends new-account email confirmations to a clean Sideline Stats success screen instead of revealing locally stored team colors or pages.
- Gives confirmed users one clear route back to Sideline Stats, with Home Screen guidance.
- Removes the duplicate plan/purchase chooser after a new team is saved; the seven-day no-card trial simply begins.

## V4.5.21 changes

- Opens first-time visitors directly into a clear seven-day trial signup experience.
- Shows Statkeeper and Team Pro trial choices with visible seasonal pricing, no card requirement and no automatic charge.
- Hides cloud-management controls until a team exists, keeping initial team creation simple.
- Stores the selected future plan with the team for trial-interest reporting.
- Adds a secure, owner-only traction dashboard backed by an authenticated Supabase Edge Function.

The existing Stripe checkout remains available when a team decides to purchase after its trial.

## Earlier releases

## V4.5.20 changes

- Lets a new team owner choose Statkeeper or Team Pro while creating an account.
- Clearly explains the seven-day full Team Pro trial, seasonal price, manual renewal, and no automatic charge.
- Automatically connects a signed-in owner's newly saved team to Supabase and starts the eligible trial.
- Makes plan selection visible and highlights whichever plan the customer taps.
- Explicitly sends the signed-in session to checkout and keeps actionable Stripe errors visible in the plan window.
- Makes trial creation work for accounts manually confirmed from the Supabase Auth dashboard.

## V4.5.19 changes

- Adds one-time seasonal plan selection for $14.99 Statkeeper and $39.99 Team Pro.
- Uses a $25 Team Pro upgrade price only when the team already has active Statkeeper access.
- Creates Checkout Sessions only inside an authenticated Supabase Edge Function.
- Activates access only after a signature-verified Stripe webhook confirms payment and verifies the purchased Price ID.
- Keeps all Stripe secret keys out of the browser and GitHub.
- Preserves permanent complimentary Team Pro access for Erie Tigers and its invited staff.
- Provides the Stripe Sandbox checkout and webhook foundation.

## V4.5.18 changes

- Added dedicated **Offense** and **Defense** sections between Play Calls and Players.
- Offense now shows identity, success by distance with play counts and yards per play, and run/pass tendencies by down.
- Defense now shows play-depth distribution, situational results, havoc by down, and opponent offense by quarter.
- Submitted coach debrief context appears beside the data-supported Coach Read on both new screens.
- The iPad/desktop masthead stays condensed while fitting the complete Sideline Stats header without cropping.
- New games automatically use the current Master Playbook numbers; existing games can load the full current playbook with one tap or copy a prior week when numbering changes.

## V4.5.17 changes

- Corrects the team Defense summary so TFL plays recorded through `tackleKind` are included.
- Preserves the accepted iPhone masthead while using a shorter Analytics masthead on tablets and computers.
- Keeps Analytics navigation and heat-map headings aligned beneath the responsive masthead.

## V4.5.16 changes

- Keeps each named play as a permanent master concept with a stable internal ID.
- Adds a separate weekly game plan, so a number can point to different plays in different games.
- Automatically carries the most recent game plan into a new game, then allows weekly renumbering from 0–99.
- Adds edit, archive and restore controls without breaking historical analytics.
- Groups Coach Pro play-call analytics by permanent play ID while displaying every weekly number used.
- Blends submitted coach debrief observations into Coach Read with explicit data-supported and coach-provided labels; drafts remain private.
- Locks every coach invitation to one email address, makes it single-use, and enforces the five-coach limit in Supabase.

Existing team playbooks and recorded play snapshots are migrated in place. V4.5.16 does not recreate the app or replace existing team data.

## V4.5.15 changes

- Refines coach accounts to two destinations only: Stats and Analytics.
- Keeps the analytics section buttons visible while scrolling and makes the Play Calls headings and play names sticky.
- Ranks Play Calls best-first overall or by the selected distance heading and compacts the table for iPhone screens.
- Rounds shared defensive credits to the nearest half tackle in Coach Pro.
- Replaces basic season bars with richer success-rate, run/pass, efficiency, and scoring trend charts.
- Prompts coaches for a postgame debrief, supports voice-to-text notes without storing audio, and adds submitted observations to Staff Context.
- Adds responsive Coach Pro Overview, Play Calls, Players, Trends, and shared Game Debrief screens.
- Adds the “WHAT’S WORKED ON 1ST DOWN” traffic-light heat map with down, metric, distance, and field-zone views.
- Adds coach invitation links and enforces viewer, coach, and statkeeper navigation permissions.
- Gives statkeepers Coach Pro access during an active trial or Team Pro plan without removing game-entry tools.
- Adds optional team identifiers so multiple teams may share the same public name while remaining separate by backend UUID.
- Adds an isolated, removable 25-call demo layer for Erie Week 2 and Week 3 analytics without altering real plays or statistics.
- Keeps the fixed company-green header while using each team's primary and accent colors throughout navigation and analytics.

## V4.5.14 changes

- Keeps the Sideline Stats masthead in the fixed company-green artwork.
- Uses each team's primary color for the statkeeper bottom navigation row.
- Uses the team accent color to identify the active tab, with automatic contrast fallback.
- Applies the same team-primary/team-accent treatment to the shared Snap Tracker action row.
- Establishes this navigation treatment for the future Coach Pro analytics screens.

## V4.5.13 — Shared Snap View

- Adds invitation-aware email sign-up and sign-in for new team viewers.
- Lets the statkeeper create one reusable parent link that automatically assigns each authenticated parent to the correct team.
- Enforces team roles so invited parents remain read-only viewers while the owner/statkeeper retains recording access.
- Makes the parent-facing Snap Tracker player cards match the in-app Snaps screen.
- Shows each player's progress bar toward the team's configured minimum, total snaps, and participation percentage.
- Uses the same stacked jersey-number and player-name layout optimized for phone screens.
- Preserves the existing 48-hour Snap Tracker invitation, offline recording queue, automatic retry, and Supabase synchronization.

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
