# Sideline Stats Platform

Sideline Stats is one product ecosystem with sport-specific applications.

## Current structure
- Gridiron Edition: existing production football application. Protect it in place.
- Hardcourt Edition: greenfield basketball application under `hardcourt/`.
- Shared platform: only capabilities that are genuinely sport-neutral should become shared.

## Architecture boundary
Hardcourt owns its UI, basketball game engine, basketball statistics, basketball analytics, local/offline state, sync logic, tests, and sport-specific database objects.

Potential shared capabilities include authentication, account identity, team/organization concepts, invitations/permissions, billing/entitlements, and brand conventions. Sharing is deliberate, not automatic.

## Production protection
Do not reorganize the existing Gridiron root application merely for architectural neatness. Do not modify Gridiron production behavior as part of Hardcourt work unless an approved task explicitly requires it.

Hardcourt begins isolated from Gridiron's football game data. Any future shared-data migration requires design review, tests, rollback planning, and owner approval.

## Reliability principle
Hardcourt is offline-first. Game-day stat entry must remain usable when connectivity is poor or absent, with safe synchronization when connectivity returns.
