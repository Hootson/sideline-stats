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


## Locked live-game UX decisions — September 2026

### Bench-first lineup and substitutions
- Lineup observation is bench-first: the statkeeper identifies players visibly on the bench and Hardcourt derives the active five.
- Game start asks who is on the bench.
- Substitution reopens the current bench state. The statkeeper may toggle only changed players or use Clear Bench and reselect the visible bench.
- The previous confirmed lineup keeps accruing minutes until Confirm is tapped. Confirm is the official substitution timestamp.
- If the clock is stopped, lineup changes do not accrue playing time.
- Validate the resulting active-player count before confirming.

### Playing time
- Playing time is derived from confirmed lineup intervals and the Hardcourt game clock.
- Provide a coach-facing shareable playing-time report sorted most-to-least, analogous in purpose to Gridiron snap counts.
- Show total minutes and derived percentage of available game time.
- Use expected team player-minutes as a data-quality sanity check.

### Periods, clock and direction
- Game Setup supports four quarters or two halves with configurable period length.
- Youth running-clock operation is a first-class workflow. Ordinary stat entry and substitution editing do not implicitly stop the clock.
- Start/Stop Clock remains directly accessible.
- Four-quarter games retain direction from Q1 to Q2, flip at halftime for Q3, and retain it for Q4. Two-half games flip for H2.
- Game Setup requires a starting direction: left-to-right or right-to-left.
- Starting direction can be flipped before tipoff if entered incorrectly.
- A later direction correction is allowed; existing shot coordinates from the affected period must be mirrored so the shot chart remains correct.
- Offensive highlight, contextual panel side and permanent control-menu side mirror together.

### Fouls
- Our-team foul flow identifies the committing player from the active five, then foul type/context.
- Default opponent foul tracking is team-level unless a granular opponent statkeeper is connected.
- Shooting-foul context flows directly into the appropriate free-throw sequence without redundant selection.
- Player foul limit is configurable by game/ruleset.
- Active-player tiles show personal-foul count and progressively warn as the player approaches the configured limit: safe/green toward yellow, orange, then red at the limit.
- The warning scale stretches to the configured limit (for example, five- versus six-foul rules).
- Foul warning treatment also carries into lineup/substitution UI.
- Hardcourt warns at/near the foul limit but never automatically removes a player.

### Timeouts
- Recording a timeout stops the Hardcourt clock automatically.
- Timeout is attributed to our team or opponent and decrements the applicable remaining count.
- Game Setup supports timeout allocation either per half or per game, with configurable quantity.
- Per-half allocation resets at halftime by default; per-game allocation does not.
- Warn but allow recording if the app believes no timeout remains.
- Substitutions remain available during a stopped-clock timeout.

### End period
- At 0:00 show a compact end-period state with score and controls to update the bench and prepare/start the next period.
- Advancing the period loads the configured next-period clock but does not accrue minutes until Start Clock.
- Preserve the confirmed active lineup unless the statkeeper updates the bench.

### Undo, edit and score correction
- Undo removes the most recent logical event, including linked secondary effects such as score, shot attempt/location and assist/rebound where applicable.
- Edit corrects an existing event and recomputes all derived statistics rather than requiring manual counter repair.
- Recent plays are editable from a recent-play/edit flow and the Plays view.
- Score Correction is separate for reconciling with the official scoreboard when the responsible historical event cannot be identified; corrections remain auditable.

### Game Setup
- Opponent name and optional logo.
- Four quarters or two halves.
- Configurable period length.
- Running-clock/manual Start-Stop game clock.
- Starting offensive direction with visual court cue.
- Configurable player foul limit.
- Timeout rules: Per Half or Per Game plus quantity.
- Select game-available roster.
- Select starting bench; Hardcourt derives the active five.
- Statkeeping may begin as Just Me; sharing can be configured without blocking game creation.
- Show a concise pre-start review strip summarizing format, period length, direction, active/bench counts and foul limit.
- Remember team/league defaults for future games while allowing per-game overrides.
