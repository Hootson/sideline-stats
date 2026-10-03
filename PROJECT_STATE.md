# Bleacher Butt Stats / Sideline Stats — Project State

Last updated: October 2, 2026

This file is the durable project-state ledger. Read it before substantial development, deployment, recovery, or architecture work. Update it after meaningful production deployments, known-good baseline changes, major feature completions, architecture changes, database migrations/functions that materially affect the app, or important unresolved issues.

## Production Guardrails

1. Do not make experimental changes directly to production when a staging/test path can be used.
2. Before a production promotion, preserve the current known-good state with an exact Git reference.
3. Test changes outside production first, then deliberately promote the tested build.
4. Never delete or overwrite a known-good recovery reference without explicit approval.
5. Do not hard-code account/team identities to solve team-resolution problems.
6. Preserve existing team, roster, game, stat, playbook, media, and analytics data unless a specifically approved change requires otherwise.
7. Prefer fixing the underlying architecture over temporary patches.
8. When production behavior is uncertain, inspect Git/Supabase state rather than guessing from version numbers or conversation memory.
9. The known-good Gridiron production baseline is the highest-priority production asset currently. Broader Bleacher Butt Stats work must not destabilize it.

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
- Legacy parent-link behavior that caused excessive egress must remain disabled; do not restore old parent-viewer data-fetch logic.

## Gridiron Production Principle

The working Gridiron application must remain independently usable while broader Bleacher Butt Stats platform/account work is developed. BleacherButtStats.com integration is a separate feature/integration effort and must not be allowed to destabilize the known-good standalone Gridiron production build.

## Bleacher Butt Stats Public Website

Status: LIVE / PUBLIC LANDING PAGE

Public domain: `https://www.bleacherbuttstats.com/`

Website repository: `Hootson/bleacher-butt-stats-site`

The public landing page is live through GitHub Pages and the GoDaddy-managed custom domain. Both the root/custom-domain setup and `www` have been tested. The site currently presents the temporary pre-launch message and a `GET MY TEAM STARTED` email CTA.

The site strips the externally appended `?utm_source=chatgpt.com` parameter from the visible browser URL so the public address remains clean.

### Early-team onboarding flow

Until automated account creation/Stripe onboarding is finished, onboarding is intentionally human-assisted:

1. Visitor clicks `GET MY TEAM STARTED`.
2. A pre-addressed email opens to `support@bleacherbuttstats.com`.
3. The email explains the 7-day free Pro trial and that the team can choose Pro or Stat Keeper afterward.
4. The intake requests:
   - SPORT: Football or Basketball
   - TEAM NAME
   - ORGANIZATION / SCHOOL
   - CITY
   - STATE
   - ACCOUNT OWNER NAME
   - ACCOUNT OWNER EMAIL
   - ACCOUNT OWNER ROLE: Coach / Stat Keeper / Other
5. Do not request passwords by email. Authentication/password setup must remain separate and secure.
6. The completed intake can be pasted into the Bleacher Butt Stats project to drive the manual Supabase/account/team setup.

## Support Email

Status: WORKING / VERIFIED BOTH DIRECTIONS

Public address: `support@bleacherbuttstats.com`

Incoming mail flow: `support@bleacherbuttstats.com` -> ImprovMX -> `supportbleacherbuttstats@gmail.com`

Outgoing mail flow: Gmail -> SMTP2GO -> recipient sees `Bleacher Butt Stats <support@bleacherbuttstats.com>`.

The domain is authenticated with SMTP2GO. Gmail `Send mail as` is configured and verified. A round-trip external reply test succeeded.

Do not store SMTP passwords or other credentials in GitHub, this file, screenshots, or chat. Credentials belong in the password manager.

## Bleacher Butt Stats Umbrella / Future Account Architecture

Status: DEVELOPMENT

Long-term direction remains one Bleacher Butt Stats identity/account umbrella with editions underneath it, including Gridiron and Hardcourt, rather than separate unrelated customer identities. The website should eventually route customers into the appropriate edition/account flow.

The umbrella/account-routing work is NOT the current Gridiron production foundation. It was intentionally excluded from the October 2 Gridiron recovery baseline after earlier integration/repository changes contributed to instability. Develop and test umbrella integration separately before deliberate production integration.

Future repository direction: eventually reorganize GitHub so a Bleacher Butt Stats repository becomes the primary umbrella repository and `sideline-stats` is no longer treated as the long-term project name. Do not perform that migration casually; preserve the known-good Gridiron production references first and plan the move deliberately.

## Hardcourt

Status: DEVELOPMENT / NEXT MAJOR WORK AREA

Next planned project work is to bring Hardcourt up to the same account/team infrastructure level as the current Gridiron experience while keeping the sport-specific stat interfaces separate.

Priority areas for Hardcourt:

- Persistent account/team association.
- Saved roster/team setup across sessions.
- Coach / Stat Keeper / viewer-role behavior aligned with the Bleacher Butt Stats model.
- Seven-day Pro trial and pricing/subscription flow aligned with Gridiron.
- Shared Bleacher Butt Stats account/setup experience.
- Parent/share functionality and notifications evaluated for parity where appropriate.
- Do not blindly copy Gridiron code into Hardcourt; deliberately port shared functionality and preserve Hardcourt-specific basketball behavior.

## Supabase / Data Safety

Supabase is the cloud backend for the current application. Treat production team/game/player/stat data as persistent user data, not disposable development fixtures.

Important current behaviors:

- Team discovery should use legitimate active account/team relationships rather than hard-coded team names.
- Player photos should use optimized media/storage behavior to minimize unnecessary storage and egress.
- Parent viewer should use lightweight status polling and lazy media loading to minimize egress.
- Historical game/stat data should remain intact even when the current roster, playbook, or player media changes.
- Do not reintroduce legacy parent-link logic that repeatedly downloads large viewer payloads.

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

Gridiron was reconstructed to the last reliable standalone architecture while preserving later legitimate Gridiron work, especially trading/player-card functionality. During validation, authentication worked but team restoration initially failed because the authenticated account could resolve more than one team relationship. The underlying team-discovery behavior was corrected rather than hard-coding Erie Tigers.

After team restoration worked, the playbook was partially recovered from historical data and sufficient current playbook data was restored for normal use. Recent standalone Gridiron improvements were then brought back into the recovery build, including optimized player-photo handling, photo removal/replacement, editable roster synchronization, parent-viewer egress reduction, and lazy-loaded/cached logo media.

The tested recovery build was then promoted to the normal GitHub Pages production root while `/recovery-test/` was preserved. A permanent known-good branch, `gridiron-known-good-2026-10-02`, was created so this state can be recovered without reconstructing history from conversation memory.

Later in the same work session, BleacherButtStats.com was made operational as the public landing page, branded support email was completed and verified, and the manual early-team onboarding email was structured so a customer request contains the information needed for backend account/team setup.

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
- The public website, onboarding, support-email, or subscription flow materially changes.

Do not clutter this ledger with every cosmetic tweak. It should remain a concise, trustworthy description of the state needed to safely continue development or recover production.