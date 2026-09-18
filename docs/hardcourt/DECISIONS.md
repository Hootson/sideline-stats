# Hardcourt Decisions

## Locked
- Product name: Sideline Stats: Hardcourt Edition.
- Hardcourt lives in the existing Sideline Stats repository as a separate application.
- Do not relocate the working Gridiron application during initial Hardcourt development.
- Landscape phone is the primary game-day orientation.
- Court-first shot entry.
- Standard field-goal attempt captures shooter, exact location, 2PT/3PT and make/miss in two taps.
- Court halves are mathematically mirrored.
- Hardcourt is offline-first.
- Hardcourt basketball game data begins isolated from Gridiron football game data.
- Existing Gridiron GitHub workflows are not Hardcourt automation.
- Phase 1 incremental AI/development spend target is $0.\n- Default opponent tracking is team-level/high-level, not player-by-player. The primary statkeeper focuses on their own roster while recording enough opponent events to maintain score and correctly derive our team's statistics.\n- Opponent player-by-player tracking must remain an optional capability rather than a requirement for ordinary one-person stat keeping.

## Product direction, not yet final implementation
- One-person stat keeping must remain simple.
- Optional simultaneous stat keeping is a desired differentiator.
- A game owner/main statkeeper can invite another authenticated statkeeper with a game-scoped link.
- A helper statkeeper can be assigned selected stat responsibilities rather than receiving an all-or-nothing role. Responsibility presets may include offense/scoring (shots, makes/misses, assists, free throws), hustle/defense (rebounds, turnovers, steals, blocks, fouls), or a custom selection of stat categories.
- The main statkeeper remains able to record any category as a safety fallback; assignments primarily simplify each helper's interface and clarify responsibility rather than making game-day recovery impossible.
- Another supported role is opponent statkeeper: a game-scoped link opens essentially the same court-first interface from the opponent team's perspective and records granular opponent events into the same game.
- Voice entry is a later capability, not a v1 requirement.
- Parents/viewers should have a strong live experience.
- Coach analytics should turn captured game data into useful decisions.

## Opponent tracking design note\nThe game/event model must be symmetric enough to support granular events for either team even though the default UI only asks the primary statkeeper for high-level opponent information. Do not clutter the primary game screen with controls solely for optional collaboration modes. Their exact entry point and mockup integration will be decided later.

## Collaborative statkeeping design note
Invitations are game-scoped and role/responsibility-scoped. The event model records who/device created each event so simultaneous contributions can merge safely. A helper's screen should emphasize only assigned controls while still showing enough shared game context (score, clock, period, lineup as appropriate) to work accurately. Assignments must not use whole-game snapshot overwrites; event-level synchronization and duplicate/conflict handling are required before collaborative mode is enabled.\n\n## Open decisions
Record unresolved choices here rather than allowing an implementation agent to invent them.
