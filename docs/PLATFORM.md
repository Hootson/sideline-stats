# Bleacher Butt Stats Platform

Bleacher Butt Stats is one product ecosystem with sport-specific applications.

## Current application surfaces

- **Gridiron Edition:** established football application rooted at the repository top level. Protect it in place.
- **Hardcourt Edition:** active basketball application under `hardcourt/`.
- **Hardcourt account/umbrella preview:** isolated integration surface under `hardcourt-account-preview/`. It is active work, not an archive or disposable duplicate.
- **Shared platform:** only capabilities that are genuinely sport-neutral and deliberately approved should become shared.

The detailed repository safety map is in `docs/REPOSITORY-GUARDRAILS.md`.

## Architecture boundary

Hardcourt owns its UI, basketball game engine, basketball statistics, basketball analytics, local/offline state, sync logic, tests, and sport-specific database objects.

Gridiron owns its football game engine, football statistics and analytics, field/voice workflows, football-specific sharing surfaces, and established root-level runtime.

Potential shared capabilities include authentication, account identity, team/organization concepts, invitations/permissions, billing/entitlements, and brand conventions. Sharing is deliberate, not automatic. Similar code in two sport surfaces is not by itself a reason to consolidate it.

## Production protection

Do not reorganize the existing Gridiron root application merely for architectural neatness. Do not modify Gridiron production behavior as part of Hardcourt work unless an approved task explicitly requires it.

Do not merge `hardcourt-account-preview/` into `hardcourt/` as incidental cleanup. Integration requires a dedicated task with runtime, account, offline, entitlement, and service-worker verification.

Hardcourt begins isolated from Gridiron's football game data. Any future shared-data migration requires design review, tests, rollback planning, and owner approval.

## Service-worker and same-origin safety

Each application/PWA must have intentional cache naming, cache cleanup, scope, and asset ownership. A worker must not delete or invalidate another Bleacher Butt Stats application's caches. Service-worker changes are runtime changes and require offline/update regression checks.

## Reliability principle

Both game-day products must remain usable under poor connectivity. Hardcourt is explicitly offline-first, and established Gridiron offline/share behavior must not be degraded by platform cleanup or consolidation.

## Backend and cost safety

Supabase schema/data/functions and commercial/billing behavior are production-sensitive. No destructive or production-changing backend operation, paid dependency, infrastructure upgrade, or additional AI spend may be introduced without explicit owner approval.
