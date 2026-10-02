# Sideline Stats Agent Rules

These rules apply to AI-assisted development.

1. Protect `main`. Feature work belongs on a dedicated branch/worktree and reaches main only through review.
2. Existing Gridiron production code is protected. Hardcourt tasks must not modify Gridiron files unless the approved task explicitly requires it.
3. Do not deploy to production automatically.
4. Do not run destructive or production-changing Supabase operations without explicit owner approval.
5. Do not introduce paid dependencies, APIs, services, infrastructure upgrades, or additional AI spend without explicit owner approval.
6. Existing legacy GitHub workflows are Gridiron-specific. Hardcourt agents must not trigger or repurpose them.
7. Build only from approved product requirements. If a material product choice is unspecified, mark it **PRODUCT DECISION REQUIRED** and pause that portion.
8. Tests are part of the feature. New game/stat logic requires automated coverage for its acceptance criteria.
9. Hardcourt is offline-first. A network failure must not erase or block ordinary game-day stat entry.
10. Prefer small, reviewable changes. Do not perform broad refactors merely to make the repository look cleaner.
11. Shared-platform changes require extra review because they can affect more than one sport.
12. Never expose secrets in source code, logs, issues, PR descriptions, or documentation.

## Agent roles
- Lead/Architect: decomposes approved work and guards architecture.
- Hardcourt Builder: implements basketball application features.
- Data/Sync Engineer: owns schema, offline state, synchronization and permissions.
- QA Engineer: tests behavior, regressions and game-day failure cases.
- UI/UX Engineer: implements approved interaction and visual specifications.

Roles describe responsibilities, not permission to make independent product decisions.
