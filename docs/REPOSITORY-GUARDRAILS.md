# Repository Guardrails

This document is the operational safety map for Bleacher Butt Stats. Use it before cleanup, refactoring, file moves, service-worker changes, backend changes, or work that crosses sport boundaries.

## 1. Protected runtime zones

### Gridiron — repository root

Treat the root web application as a live, coupled runtime. Representative protected files/surfaces include:

- `index.html`, `app.js`, `styles.css`, `service-worker.js`, `manifest.webmanifest`, `version.js`
- football field/game modules such as `field-position.js`, `field-orientation.js`, `game-lifecycle.js`, `edit-play-model.js`
- voice/follow-up modules and styles
- `coach-analytics.js`, `commercial-access.js`, owner/business runtime files
- `parent-viewer.*`, `snap-tracker.*`, player-profile/player-card runtime files
- root brand/PWA assets required by those surfaces

This list is representative, not permission to delete an unlisted root file. Search references before any deletion or move.

### Hardcourt — `hardcourt/`

Treat the entire directory as an active basketball runtime unless a file has been individually proven obsolete. Its service worker, app/engine code, HTML/CSS, manifest, court/header artwork, tests, and any sport-specific assets are protected together.

### Hardcourt account/umbrella preview — `hardcourt-account-preview/`

Treat the entire directory as active integration work, **not a disposable copy of `hardcourt/`**. It may intentionally duplicate baseline Hardcourt files while adding account/onboarding/session/entitlement/integrity layers. Identical blobs across these directories do not prove one copy is unnecessary.

### Backend — `supabase/`

Treat migrations, Edge Functions, configuration, policies, and backend-support material as production-sensitive. Repository edits still require review; executing destructive or production-changing operations requires explicit owner approval.

## 2. Cross-cutting protected areas

- `.github/`: workflows and integration helpers can affect CI or branches. Audit triggers and references before modification/removal.
- `tests/` and sport-local tests: regression protection; do not delete merely because tests target older behavior without proving the behavior is gone.
- `assets/` and root image assets: may be runtime, PWA, share-card, or design dependencies.
- `.agents/skills/`: development/design instructions used by agent workflows; not application dead weight.
- `docs/hardcourt/`: product decisions and acceptance criteria; update deliberately when behavior changes.

## 3. Required pre-delete audit

Before deleting or moving a file/directory, check all applicable sources:

1. HTML `<script>`, `<link>`, image, manifest, and navigation references.
2. JavaScript dynamic imports, fetches, worker registration, generated URLs, and string-built paths.
3. CSS `url(...)` references.
4. Service-worker precache/runtime cache lists and worker scope assumptions.
5. Web manifests and PWA icons/start URLs.
6. Tests and fixtures.
7. GitHub Actions/workflows and helper scripts.
8. Supabase functions/migrations/configuration.
9. Public viewer, invitation, QR, trading-card, parent, coach, or statkeeper links.
10. Documentation that identifies the file as current architecture.

If the audit is inconclusive, retain the material and record it for a later targeted investigation.

## 4. Required pre-change checks by category

### Service worker / PWA

Confirm cache name/prefix isolation, service-worker scope, start URL, asset paths, offline startup, update/activation behavior, and whether another app on the same origin could be affected. Never treat a cache rename as cosmetic.

### Shared account/auth/billing

Confirm which sport/application owns the current implementation, role/permission behavior, existing account compatibility, entitlement/trial behavior, and backend dependencies. Do not create a shared abstraction merely because two implementations look similar.

### Data/schema/sync

Confirm backwards compatibility with existing local and cloud records, offline queues, conflict handling, permissions/RLS, and rollback strategy. No destructive production operation without owner approval.

### Public/share surfaces

Confirm old links remain valid where expected. Parent viewer, snap tracker, coach invitations, statkeeper links, QR/trading-card destinations, and installed PWAs can depend on stable paths that are not obvious from the primary app screen.

## 5. Cleanup standard

A cleanup deletion should satisfy all of these:

- High confidence that the material is generated, obsolete, superseded, or unreachable.
- No live/runtime reference found in the audit above.
- No required historical/product record is lost; archive documentation or rely on Git history as appropriate.
- The cleanup is isolated on a branch with a known pre-cleanup checkpoint.
- The resulting branch diff contains no unintended live-code changes.

Do **not** delete based only on age, naming (`old`, `preview`, version numbers), duplication, lack of obvious imports, or a desire to make the tree prettier.

## 6. Post-change verification

For repository cleanup or architecture work:

1. Compare the working branch against the intended base/checkpoint.
2. Classify every changed path as documentation, intentional runtime change, test change, generated/dead removal, or backend change.
3. Verify unexpected live-code modifications are zero.
4. Re-read affected service-worker asset lists after any file move/delete.
5. Run relevant tests when executable behavior changes.
6. Preserve a rollback point before merging/deploying.

## 7. Escalation rule

Stop and ask for an owner decision when the safe choice materially changes product architecture, public URLs, pricing/billing behavior, stored customer/team data, production backend state, paid infrastructure, or when evidence cannot establish whether a potentially live component is safe to remove.

When the choice is simply between deleting uncertain material and keeping it, keep it; that does not require escalation.
