# Bleacher Butt Stats

Bleacher Butt Stats is a multi-sport youth-sports statistics platform. This repository currently contains the established **Gridiron Edition** football application, the **Hardcourt Edition** basketball application, and an isolated **Hardcourt account/umbrella preview** used to develop account, entitlement, onboarding, and sharing behavior before deliberately integrating it into the main Hardcourt runtime.

> **Safety rule:** this is a working product repository, not a refactor sandbox. Do not move, rename, consolidate, delete, or broadly rewrite application files just because the layout looks untidy. Verify runtime ownership and references first.

## Authoritative application map

| Area | Repository location | Status | Boundary |
| --- | --- | --- | --- |
| Gridiron Edition | repository root (`index.html`, `app.js`, `service-worker.js`, supporting root JS/CSS/assets) | Live/established application | Protected in place. Football work may touch these files; Hardcourt-only work must not. |
| Hardcourt Edition | `hardcourt/` | Active basketball application | Owns basketball UI, game engine, stats, analytics, offline behavior, and sport-specific runtime. |
| Hardcourt account/umbrella preview | `hardcourt-account-preview/` | Active integration/preview surface | Intentionally separate. Do not assume files duplicated from `hardcourt/` are dead or interchangeable. |
| Shared documentation | `docs/` | Current architecture, product, cost, and agent guidance | Documentation only unless a task explicitly changes behavior. |
| Supabase project material | `supabase/` | Backend schema/functions/configuration used by product features | Treat as production-sensitive. No destructive or production-changing operation without explicit owner approval. |
| Tests | `tests/`, `hardcourt/tests/` where present | Regression/behavior protection | Preserve and update with behavior changes. |
| GitHub automation | `.github/` | CI/test/integration tooling | Do not repurpose historical-looking automation without auditing its references and trigger behavior. |
| Trading-card design skill/assets | `.agents/skills/trading-card-design/`, `assets/player-cards/` | Active design/runtime support | Preserve unless a trading-card task explicitly changes them. |

## Gridiron boundary

Gridiron remains rooted at the repository top level. Its production/runtime surface includes the root entry point, service worker, application scripts, styles, PWA/viewer/snap-tracker surfaces, player-card code and required brand assets.

**Do not reorganize Gridiron into a new directory for neatness.** A structural migration would change URLs, service-worker scope, cached asset paths, viewer/share links, and potentially installed-PWA behavior. Such a migration requires its own approved plan, tests, rollback path, and deployment verification.

The root service worker's asset list is an important runtime dependency map, but it is not necessarily exhaustive of every navigable/shared surface. Before deleting a root file, search references in HTML, JS, CSS, service workers, manifests, tests, workflows, Supabase functions, and documentation.

## Hardcourt boundary

`hardcourt/` is the basketball product runtime. Keep basketball game logic isolated from football logic unless a capability has explicitly been approved as shared platform behavior.

`hardcourt-account-preview/` is **not an archive**. It is an intentionally isolated account/umbrella integration surface and currently contains additional account, onboarding, entitlement, session, integrity, recovery, and runtime bridge layers. Do not merge it into `hardcourt/`, delete it, or copy files between the two trees merely because some files have identical content.

## Shared-platform rule

Authentication, account identity, team/organization concepts, invitations/permissions, billing/entitlements, and brand conventions may become shared. Sharing must be deliberate. Sport-specific game engines, stat models, analytics, offline state, and game-day UI stay sport-owned unless an approved architecture task says otherwise.

## Change guardrails

1. Work on a dedicated branch. Protect `main` and known safety/checkpoint branches.
2. Make the smallest change that solves the approved task; avoid opportunistic cleanup in feature work.
3. Before deleting or moving anything, prove it is not referenced by a live runtime, service worker, manifest, workflow, test, backend function, or public/share URL.
4. Treat service-worker cache names, scopes, and asset paths as production behavior. Changes require explicit regression checks for installed/mobile/offline use.
5. Never perform destructive Supabase operations, schema/data deletion, or production-changing backend actions without explicit owner approval.
6. Never introduce paid infrastructure, dependencies, APIs, or additional AI spend without explicit owner approval.
7. Preserve backwards compatibility for existing team/game data unless a migration is explicitly approved and has rollback coverage.
8. Do not expose secrets in source, commits, logs, issues, documentation, or client-side configuration beyond intentionally public client keys.
9. If ownership of a file is uncertain, **keep it and investigate**. Uncertainty is not evidence that something is dead.
10. After repository cleanup, compare the cleanup branch to its base and verify that live application blobs were not modified unless explicitly intended.

See `docs/REPOSITORY-GUARDRAILS.md` for the detailed pre-change checklist and protected-path guidance.

## Documentation

- `docs/PLATFORM.md` — current platform boundaries and reliability principles.
- `docs/AGENT-RULES.md` — rules for AI-assisted development.
- `docs/REPOSITORY-GUARDRAILS.md` — repository safety map and change checklist.
- `docs/COST-POLICY.md` — spending/infrastructure constraints.
- `docs/hardcourt/` — Hardcourt specification, decisions, and acceptance criteria.
- `docs/history/GRIDIRON-RELEASE-HISTORY-PRE-4.6.md` — pointer to the former root Gridiron release-history README preserved in Git history.

## Current cleanup posture

Repository cleanup is intentionally conservative: remove only material that can be demonstrated to be obsolete, generated, or superseded. Historical-looking code is not automatically dead code. Current production and preview behavior takes priority over cosmetic repository organization.
