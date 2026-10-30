# Bleacher Butt Stats — Project Status

**Last updated:** October 29, 2026 (America/Denver)  
**Gridiron Edition production:** v4.6.90  
**Source of active deployment:** `gh-pages` branch of `Hootson/sideline-stats` (GitHub Pages)  
**Repository default branch:** `main` — its historical README is *not* the current production changelog.

> This file is the technical handoff for work on Bleacher Butt Stats. Distinguish verified functionality from features merely implemented or awaiting real-device tests. Never replace working local game data or historical Supabase rows without explicit verification.

## Executive status

**Gridiron:** Recovery of the Erie Tigers' Dakota Ridge playoff game succeeded, survived an iPhone restart, and the completed game was verified in Supabase as **Final, Erie 30–0, 120 plays, 91 snaps**. The next newly created game's automatic sync is **not yet end-to-end verified** in v4.6.90.

**Hardcourt:** Basketball edition is in development, with additional analytics/design work planned. This Gridiron recovery did not test or change Hardcourt.

### Verified facts (as of October 29, 2026)

| Check | Result | Verification |
| --- | --- | --- |
| iPhone app version | **PASS** | User showed v4.6.90. |
| Dakota Ridge recovered locally | **PASS** | App reported 120 plays and 91 snaps; user checked game score, Snap Tracker, and player stats. |
| Restarts retain recovered data | **PASS** | User reopened app and saw “Verified game recovered from durable device storage”; confirmed game and stats remained correct. |
| Sync health indicator | **Observed green** | “New-game sync active • History protected,” with verified backup timestamp. Not proof of all future sync flows. |
| Dakota Ridge finalized in cloud | **PASS** | Supabase row: `status=final`, `revision=129`, score 30–0, 120 active plays, 91 active snaps. |
| User emergency backups | **Saved by user** | Two JSON backups were saved to Files before successful recovery; preserve both. |
| Newly created playoff game's first backup | **NOT YET VERIFIED** | User was told creating a new game is okay; cloud creation and first play/snap backup have not yet been checked. |
| Parent viewer, roster additions, live deletions | **Needs regression testing** | Historically delayed/missing updates despite locally correct data. |
| Supabase egress and app responsiveness | **Needs measurement** | Local-first and guarded sync changes implemented, but no current verified egress baseline. |

### Verified Dakota Ridge cloud record

- Opponent: **Dakota Ridge Eagles**; first playoff game.
- Supabase game ID: `760b4831-72a0-4d49-97ca-f8047b3572ab`
- Supabase status: **final**; revision **129**; **30–0** Erie victory.
- **120 active play records** and **91 active snap records** remained after finalization.
- Phone backup originally contained only 52 plays / 0 snaps; the initial 52 play identities and content matched the cloud prefix before recovery.
- Recovery was accomplished without writing to Supabase. Subsequently, user finalized the game and cloud finalization was verified.
- **Do not overwrite, delete, or archive this game as a testing shortcut.**

## Most recent production work (October 29, 2026)

### Incident: divergent phone/cloud game and iOS storage quota

An older iPhone snapshot conflicted with a newer Supabase game revision. The guarded writer correctly blocked automatic overwriting. Manual cloud recovery then failed under Safari localStorage quota and IndexedDB transaction limits.

- **v4.6.88:** Added manual `Recover Newer Cloud Game` workflow: verifies owner, game identity, play prefix/order, stat credits, snap participants, and cloud revision; asks permission and initiates JSON backup; does **not** alter cloud game records.
- **v4.6.89:** Added IndexedDB durability, but storing multiple large copies still aborted on the user's iPhone.
- **v4.6.90:** Fixed the transaction size by storing **one compact/compressed/read-back-verified** recovery snapshot in IndexedDB, while leaving prior `localStorage` phone snapshots intact. Boot hydrates the durable recovery before cloud initialization. **Confirmed successful on iPhone.**

**Relevant deployed files:** `app.js`, `index.html`, `version.js`, `service-worker.js`, `storage-snapshot.js`, `durable-recovery.js`, `verified-cloud-recovery.js`.

**Safety constraints in current production:**
1. `CLOUD_WRITES_PAUSED=true` quarantines the legacy broad/historical synchronization writer. Do not casually reverse this flag.
2. Only explicitly enrolled new games use guarded `safeSyncOwnedGame` / `runSafeSyncQueue` synchronization.
3. Never equate a green sync badge to a database audit. Confirm game row, play count, snap count, cloud revision, and intended status.
4. Do not ask users to clear browser data, remove a live game, or reinstall as a first-line fix; this can destroy the most recent local record.
5. Durable IndexedDB recovery is important while quota is constrained. Protect its saved state and retain exported JSON backups.
6. Game corrections/deletions require identity and revision checks; avoid accidental writes to historical records.

## Next session — highest priority: new playoff game verification

The user's next action is to create a **new playoff game**. The user's confirmation of its creation is **not yet recorded**.

After it is created:
1. Confirm opponent, playoff week/game type, game plan, and correct Erie Tigers roster. Latest screenshot showed **17 players** on the roster; verify live count rather than assuming it remains 17.
2. Verify new game survives an app close/reopen, including recovery of the prior finalized game.
3. Inspect Supabase *read-only* for exactly the expected new game under the Erie team/season, correct `status=live`, and no duplicate records.
4. Verify guarded backup acknowledges the game's actual cloud ID/revision and does not show pending/errors.
5. With user approval, test an intentional play and snap; confirm remote play/credits and snap/participants match. Do not silently create or delete production test data.
6. Check parent share link and Snap Tracker show the new game and subsequent updates without manual refresh.
7. Monitor for quota failures, UI lag, repeated reads, or unexpected cloud revision changes.
8. Do **not** finalize the new game until the actual game has ended and the user directs it.

### Other Gridiron items still open

- Parent Viewer reliability after roster additions and play deletion.
- Shared Snap Tracker newly added roster players and invitation refresh.
- Reduce Supabase egress while keeping viewer real-time and statkeeper controls responsive.
- Restore/verify team and opponent logos across old games, phone, and shared viewers.
- Recheck saved-game View/Edit/Remove-from-phone actions, including strict cloud-match requirements before removal.
- Single-team owner auto-load and multi-team selection; verify account screen behavior.
- Comprehensive offline-to-online sync/duplicate-prevention regression test.

## Hardcourt Edition — separate roadmap

- Maintain the Bleacher Butt Stats umbrella and common account/team, game creation, sharing, statkeeper and coach experience.
- Existing basketball tracking includes shots, assists, rebounds, turnovers/steals, fouls, subs, timeouts, playing time, plus/minus, and game/stats views. These features were **not** regression-tested in this recovery session.
- Next major focus is deeper **offense, defense, player, lineup, and situational analytics**, comparable in usefulness to Gridiron analytics.
- Review prior Hardcourt design/version notes before changing UI; do not transplant Gridiron patches without independent tests.

## Commercial and deployment notes

- Brand: **Bleacher Butt Stats** — **Gridiron Edition** and **Hardcourt Edition**.
- Backend: Supabase; source/deploy: GitHub. Production Gridiron code currently deploys from `gh-pages`.
- Trial and paid entitlement work, Stripe integration, coach and parent roles exist in the project; billing flows need their own pre-launch validation.
- Erie Tigers has complimentary founder/Team Pro access.
- Historical code includes Statkeeper **$14.99** and Team Pro **$39.99** plan values; confirm final pricing before launch rather than assuming prior brainstorms are final.

## Handoff rules

- Start new engineering work by reading **this status.md** and the **actual production `gh-pages` code**, not just the older `main` README.
- Make small, reviewable changes; test and verify the deployed code and Supabase separately.
- Preserve both the finalized Dakota Ridge record and both user-saved JSON backups.
- When reporting progress, label **implemented**, **tested in simulation**, **verified on iPhone**, and **verified in Supabase** separately.
- Update this document as soon as the next game's creation, cloud backup, viewer, or Snap Tracker tests are verified.
