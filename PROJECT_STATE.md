# Sideline Stats — Project State

Last updated: October 2, 2026

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
