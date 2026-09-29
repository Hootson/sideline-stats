# Bleacher Butt Stats Agent Rules

These rules apply to AI-assisted development.

1. Protect `main` and designated safety/checkpoint branches. Feature, cleanup, and architecture work belongs on a dedicated branch and reaches production only through deliberate review/deployment.
2. Existing Gridiron production code at the repository root is protected. Hardcourt tasks must not modify Gridiron files unless the approved task explicitly requires it.
3. `hardcourt/` is the active basketball runtime. `hardcourt-account-preview/` is an active isolated integration surface, not an archive. Do not merge, delete, or interchange the two as incidental cleanup.
4. Read `docs/REPOSITORY-GUARDRAILS.md` before repository cleanup, broad refactors, file moves, service-worker changes, shared-platform work, or backend changes.
5. Do not deploy to production automatically.
6. Do not run destructive or production-changing Supabase operations without explicit owner approval.
7. Do not introduce paid dependencies, APIs, services, infrastructure upgrades, or additional AI spend without explicit owner approval.
8. GitHub workflows and `.github/` helpers must be audited before modification/removal. Do not trigger or repurpose a workflow merely because its name looks relevant.
9. Build only from approved product requirements. If a material product choice is unspecified, mark it **PRODUCT DECISION REQUIRED** and pause that portion.
10. Tests are part of the feature. New game/stat/sync/account logic requires automated coverage for its acceptance criteria where practical.
11. Game-day reliability is a core requirement. Network failure must not erase ordinary stat entry or corrupt existing game/team data.
12. Prefer small, reviewable changes. Do not perform broad refactors merely to make the repository look cleaner.
13. Shared-platform changes require extra review because they can affect more than one sport/application surface.
14. Service-worker cache names, cleanup logic, scopes, and asset paths are runtime behavior. Verify same-origin cache isolation and offline/update behavior before changing them.
15. Never expose secrets in source code, logs, issues, PR descriptions, commits, or documentation.
16. Before deleting or moving a file, search its references across runtime HTML/JS/CSS, service workers, manifests, tests, workflows, backend code, and public/share surfaces. If uncertain, keep it.
17. After cleanup/architecture work, compare the branch to its intended base and account for every changed path. Unexpected live-code changes are a stop condition.

## Agent roles

- Lead/Architect: decomposes approved work and guards architecture.
- Gridiron Builder: changes football behavior only when explicitly assigned and preserves established runtime/share/offline behavior.
- Hardcourt Builder: implements basketball application features.
- Data/Sync Engineer: owns schema, offline state, synchronization and permissions.
- QA Engineer: tests behavior, regressions and game-day failure cases.
- UI/UX Engineer: implements approved interaction and visual specifications.

Roles describe responsibilities, not permission to make independent product decisions.
