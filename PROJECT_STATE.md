
## October 10 — v4.6.59 Egress Root-Cause Investigation

Production edge logs 08:00–11:00 MDT: 2,817 GET snap_participants, 2,467 GET play_credits, 1,238 PATCH players (HTTP 204), 703 snap tracker RPC GET equivalents. The 1,238 player PATCHes targeted five unchanged player IDs ~236–251 times each, confirming a repeated inactive-roster write loop. Requests for credits/participants shared one client/IP and correlate with full-season viewer refreshes; this is more specific than an ordinary multi-viewer explanation.

Fixes: inactive roster players now get `playerHashes[id]='inactive'` after successful deactivation, preventing re-PATCH every sync; realtime subscription no longer triggers full-season refresh per play_credit/snap_participant row; post-load full-season recheck removed; checkCloudForUpdates now delegates to lightweight game revisions; realtime debounce increased to 1.5s; snap tracker background polling disabled and foreground interval changed 10s→60s (immediate writes remain). Version bumped 4.6.59. No database records modified. JS syntax checked. **Production egress and device regression still need verification.**

# Sideline Stats — Project State

Last updated: October 10, 2026

This file is the repository's durable project-state ledger. Read it before substantial development, deployment, recovery, or architecture work. Update it after meaningful production deployments, known-good baseline changes, major feature completions, architecture changes, database migrations/functions that materially affect the app, or important unresolved issues.

## Production Guardrails

1. Do not make experimental changes directly to production when a staging/test path can be used.
2. Before a production promotion, preserve the current known-good state with an exact Git reference.
3. Test changes outside production first, then deliberately promote the tested build.
4. Never delete or overwrite a known-good recovery reference without explicit approval.
5. Do not hard-code account/team identities to solve team-resolution problems.
6. Preserve existing team, roster, game, stat, playbook, media, and analytics data unless a specifically approved change requires otherwise.
7. Prefer fixing the underlying architecture over temporary patches.
8. When production behavior is uncertain, inspect Git/Supabase state rather than guessing from version numbers or conversation memory.

## Current Production — Gridiron

Status: KNOWN GOOD / PRODUCTION

Production URL: https://hootson.github.io/sideline-stats/

Recovery baseline URL: https://hootson.github.io/sideline-stats/recovery-test/

Known-good branch: `gridiron-known-good-2026-10-02`

Known-good production promotion commit: `d814a072b5cad11ee047e9b8632a9a0cdd4f1536`

The October 2, 2026 recovery build is the current authoritative standalone Gridiron baseline. The `/recovery-test/` copy must be preserved as a known-good recovery build unless a newer baseline is explicitly established.

### Verified/restored functionality in this baseline

- Standalone Gridiron operation without BleacherButtStats.com umbrella routing.
- Supabase authentication and cloud team restoration.
- Team resolution corrected so disabled team relationships do not create ambiguous normal team discovery.
- Erie Tigers account/team restoration working.
- Royal Thunder / Lucas account flow intended to continue through the existing production URL and cloud relationship model.
- Existing roster, games and historical statistics restored/available.
- Offensive playbook restored from recoverable historical data; additional/current plays may be maintained normally in the app.
- Trading/player card functionality restored.
- Parent shared link functionality restored.
- Player headshot and action-photo upload functionality restored.
- Large player images are resized/compressed before storage to reduce storage and egress use.
- Player headshots and action photos can be removed/replaced without deleting the player or statistics.
- Hardened roster editing for player name and jersey number restored, including cloud synchronization.
- Parent viewer egress optimization restored: lightweight status/change-token polling rather than repeatedly downloading the full viewer payload.
- Parent-viewer media/logo behavior optimized so logos are lazy-loaded/cached rather than unnecessarily refreshed with every status check.
- Polling stops for finalized games.

## October 5, 2026 — Coach Onboarding Verified

Status: VERIFIED IN PRODUCTION

The Gridiron coach invitation/onboarding flow has now been tested end-to-end with a fresh coach account and is working as intended.

Verified behavior:

- A coach invitation link routes an unsigned-in coach to the lightweight coach invitation/auth screen rather than the full app.
- Mobile/iPad keyboard entry works correctly on the invitation form.
- A new coach can enter email, password, and confirm password to create the account.
- Supabase sends the email confirmation/authentication message successfully.
- After the coach clicks the authentication link, the confirmed session is recognized and the coach invitation continues automatically; the user is not forced back through account creation.
- If a confirmed user still needs to sign in, the post-confirmation state is sign-in mode with email + password only; confirm password is hidden.
- On successful authentication, the coach invitation is redeemed automatically, the assigned team loads immediately, and the coach can see team statistics in the Analytics tab.
- Fresh end-to-end test confirmed the invited coach landed directly in the Erie Tigers team and could view Analytics without creating a trial or a separate team.

Relevant production change: coach confirmation/sign-in handoff in start.html, commit f186b77b03ee21676f24225fcb0abd3881a4e06e on gh-pages.

This coach onboarding flow is now considered a working production checkpoint. Avoid changing it casually; preserve the automatic invitation-token handoff and direct team-load behavior when making future authentication/account changes.

## Gridiron Production Principle

The working Gridiron application must remain independently usable while broader Bleacher Butt Stats platform/account work is developed. BleacherButtStats.com integration should be treated as a separate feature/integration effort and must not be allowed to destabilize the known-good standalone Gridiron production build.

## Bleacher Butt Stats Umbrella

Status: DEVELOPMENT / NOT THE CURRENT GRIDIRON PRODUCTION FOUNDATION

BleacherButtStats.com umbrella/account-routing work was intentionally excluded from the October 2 Gridiron recovery baseline after integration/repository changes contributed to production instability. Future umbrella integration should be developed and tested separately before any deliberate production integration.

## Hardcourt

Status: DEVELOPMENT

Hardcourt is part of the broader Bleacher Butt Stats project but is not the production Gridiron baseline described above. Do not assume Gridiron production changes should automatically be applied to Hardcourt or vice versa; shared functionality should be deliberately evaluated and ported.

## Supabase / Data Safety

Supabase is the cloud backend for the current application. Treat production team/game/player/stat data as persistent user data, not disposable development fixtures.

Important current behaviors:

- Team discovery should use legitimate active account/team relationships rather than hard-coded team names.
- Player photos should use optimized media/storage behavior to minimize unnecessary storage and egress.
- Parent viewer should use lightweight status polling and lazy media loading to minimize egress.
- Historical game/stat data should remain intact even when the current roster, playbook, or player media changes.

## Release Procedure Going Forward

For meaningful Gridiron changes:

1. Read this file first.
2. Identify the current production commit and known-good baseline.
3. Preserve the current production state before risky work.
4. Make/test changes in a separate branch or staging/test path.
5. Smoke-test at minimum: login/team load, roster, games, stat entry, playbook where relevant, player cards/photos, parent link, and multi-account/team behavior where relevant.
6. Promote only after the test build is intentionally approved.
7. Create/update the known-good Git reference for the newly approved production state.
8. Update this file with the new production commit, baseline reference, major changes, and any unresolved risks.

## October 2, 2026 Recovery Record

Gridiron was reconstructed to the last reliable standalone architecture while preserving the later legitimate Gridiron work, especially the trading/player-card functionality. During validation, authentication worked but team restoration initially failed because the authenticated account could resolve more than one team relationship. The underlying team-discovery behavior was corrected rather than hard-coding Erie Tigers.

After team restoration worked, the playbook was partially recovered from historical data and sufficient current playbook data was restored for normal use. Recent standalone Gridiron improvements were then brought back into the recovery build, including optimized player-photo handling, photo removal/replacement, editable roster synchronization, parent-viewer egress reduction, and lazy-loaded/cached logo media.

The tested recovery build was then promoted to the normal GitHub Pages production root while `/recovery-test/` was preserved. A permanent known-good branch, `gridiron-known-good-2026-10-02`, was created so this state can be recovered without reconstructing history from conversation memory.


## October 10, 2026 — Player Card Analytics Verified

Status: **PARTIALLY VERIFIED — generation/open events recorded; sharing attribution remains unverified.**

- **Correct telemetry source:** Supabase `public.viewer_events`, using `event_type`, `player_id`, `game_id`, `session_id`, and `created_at`. **Do not query `public.analytics_events` for player-card activity:** that table contains billing/trial events and had no card events when checked. Earlier reports of zero card activity were caused by querying the wrong table.
- Verified live on October 10 (Mountain Time): **3 `player_card_generate` events** for player **Bryce**, approximately **1:31–1:32 PM MDT**, and **2 `player_card_open` events** with no player ID. Three generation events are not proof of three distinct cards or people.
- No `player_card_share` event was found in the October 10 card-event query. This does **not** establish that nobody shared a card; instrumented share/download success and actual recipient opens must be distinguished and independently validated.
- **Do not implement a duplicate analytics system in `analytics_events`.** First trace the existing `viewer_events` instrumentation and the public player-card UI, then add only missing event coverage and test it end to end.
- The previously reported **Connor** card and several other cards are historical user reports, not reconfirmed by the October 10 query. Preserve this distinction in future reporting.

## October 8–10, 2026 — Gridiron Sync Recovery

- **Production release: 4.6.54** on `gh-pages` (merged PR #19, commit `3696e29794f3154747ef161f937a4b3bdbcd9eca`). The October 2 known-good recovery branch remains preserved; it is **not** the same commit as current production.
- Version 4.6.53 introduced **Back to Saved Games** without requiring finalization. User deleted the unfinalized **Brett Test** game; Supabase subsequently confirmed that game's cloud record was **archived**.
- Version 4.6.54 avoids attempting individual cloud deletions of plays/snaps whose parent game is confirmed archived; other deletion safety checks remain in place.
- User supplied screenshot confirming **Cloud synced**, no visible pending operations or error, at approximately **1:01 PM Mountain Time on October 8**. This verifies the reported device sync state, **not** a full row-by-row audit of historical Weeks 2–7.
- Historical Weeks 2–7 statistics should be protected and separately audited before any destructive reconciliation. No direct production database mutation was performed during the 4.6.54 code deployment.


## October 10, 2026 — v4.6.58 Storage & Supabase Egress Architecture

- **Problem:** iPhone localStorage quota errors continued through 4.6.57 even with successful cloud sync. October 10 diagnostic backup includes Weeks 2–8; preserve all records and keep manual Sync Backup available.
- **Storage design:** new `storage-snapshot.js` versioned `SSZ1:` LZW codec. Legacy plain JSON snapshots still load; compressed main/recovery snapshots decode transparently. Main snapshot first attempts complete JSON, then compressed complete state, then compressed state without embedded image data if quota-constrained. Existing snapshots are not proactively deleted. Compressed recovery copy is best effort and limited to one update per 30 seconds during a session. Manual downloaded Sync Backup remains full JSON.
- **Migration compatibility:** `version.js` loads after the codec and its legacy score-repair/fetch safety reads compressed snapshots. Compression does not alter game statistics or cloud payloads.
- **Egress reduction:** removed per-sync full-season `remoteCloudFingerprint()` fetch (which included plays, credits, penalties, snaps, snap participants, and coach demo records), removed repeating 15-second full-season fingerprint poll, and reduced lightweight viewer game revision polling from 3 to 15 seconds. Realtime notification and manual Refresh Cloud remain available. This lowers repetitive Supabase outbound reads; quantify with Supabase egress dashboard after deployment.
- **Verification:** JavaScript syntax checked on four release files; compression round-trip tested with synthetic football plays and Unicode. **Real-device migration and quota testing remain required.** No SQL/data deletion performed.
- **Known caveat:** 30-second throttled recovery is not guaranteed to contain the most recent unsynced play if the primary local save fails; cloud sync and manual backups remain important. Avoid clearing Safari data or resetting team.

## When to Update This File

Update PROJECT_STATE.md when any of the following happens:

- A new production build is promoted.
- The known-good production branch/tag/commit changes.
- Production or staging URLs change.
- A major Gridiron, Hardcourt, or BBS feature reaches a meaningful checkpoint.
- Authentication/team/account architecture changes.
- A material Supabase schema, RPC, migration, storage, or data-flow change is introduced.
- Deployment/repository architecture changes.
- A production incident reveals a new guardrail or recovery requirement.

Do not clutter this ledger with every cosmetic tweak. It should remain a concise, trustworthy description of the state needed to safely continue development or recover production.
