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

## September 20, 2026 — pre-Alpha locked additions

### Brand and cross-sport inheritance
- Umbrella brand is **Bleacher Butt Stats**. Basketball product is **Hardcourt Edition**.
- Hardcourt inherits Gridiron behavior wherever a requirement is sport-neutral; redesign only when basketball requires it or a deliberate platform-wide improvement is approved.
- Product branding and team branding are separate. The Bleacher Butt Stats / Hardcourt Edition header keeps product branding. Team primary and accent colors are configurable and flow through app screens, navigation, highlights and accents with accessible contrast.

### Responsive game UI
- One responsive landscape Game interface serves iPhone and iPad. It is not a separate tablet workflow.
- Relative control positions, tap sequences, scoreboard, court, active-five area and navigation remain the same.
- Larger screens gain scale and breathing room without distorting court geometry or creating giant controls.
- Court aspect ratio is preserved.

### Court and touch geometry
- The approved visual mockup is reference, not geometry source. Court is drawn programmatically from one half and mirrored.
- Three-point geometry must leave usable corner-three tap space and avoid excessive dead hardwood between arc apex and center court.
- Visible line geometry and hit classification may differ: use forgiving invisible touch regions around the 3PT boundary to reduce fat-finger 2/3 misclassification while remaining deterministic.
- Exact approved Hardcourt logo asset is placed at center court; do not generatively recreate it in production.

### Stats
- Views: Game, Regular Season, Playoffs, Season Total.
- Core box score: MIN, PTS, FG, 3PT, FT, REB, AST, STL, BLK, TO, PF, +/-.
- Team Total row.
- Player identity remains visible while wide stat columns scroll when necessary.
- Player row can open a Player Game Card with shooting splits, core stats and personal shot chart.

### Playing Time
- First-class top-level area occupying the same conceptual navigation position as Gridiron Snap Counts.
- Show total minutes, percent of available game time and a visual participation bar.
- Distinguish Starter, DNP/0:00 and unavailable/not-rostered states.
- Sort most-to-least minutes by default.
- Show expected player-minutes sanity check (game length x five) against recorded total.
- Season views may derive games played, total minutes, average minutes/game and percentage of available minutes.
- This view is objective/read-only; lineup editing remains on Game.

### Shooting analytics
- Exact shot coordinates support Shot Chart, Heat Map, Zones, Frequency and Efficiency views.
- Filters support team/player, game/selected games/season, period and shot type.
- Individual shot inspection may show shooter, result, 2/3, period/time and assist when present.
- Heat/zone displays must expose sample size and avoid overstating tiny samples.
- Frequency and efficiency are distinct views.
- Invisible near-rim zones classify Left Rim, Center Rim and Right Rim. Do not infer technical shot type such as layup solely from location. Coach-facing grouping may be called Finishing at the Rim.
- Rim-side performance is trendable across games/season and available to Coaching Read.

### Fast break — Alpha experiment
- Field-goal events support fast_break true/false/null.
- A persistent but compact Fast Break control arms the next field-goal attempt; the next made or missed shot receives the tag and the control auto-clears.
- Tapping again cancels before the shot.
- Ordinary shots remain two taps.
- Recent-play editing can add/remove the tag after entry.
- Fast Break does not stop the clock.
- Analytics can derive attempts, makes, FG%, points, player/location/rim-side breakdown and trends.
- Retention of permanent Game-screen real estate is explicitly subject to real-game Alpha testing.

### Lineups and plus/minus
- Derive lineup MIN, points for, points against and +/- for each five-player combination.
- Show sample playing time prominently; avoid unsupported best-lineup declarations from tiny samples.
- Support individual on/off and a lineup timeline derived from confirmed intervals.
- Timeline corrections recompute minutes and +/-.
- Every scoring event applies scoring differential to the confirmed active five.
- Unattributed historical score corrections must not silently assign +/- to whichever lineup is currently active.

### Analytics and Coach Debrief
- Analytics home organizes Overview, Shooting, Players, Lineups and Trends.
- Trend windows include Last 5, Last 10, Season and Select Games where data permits.
- **Coach Debrief -> AI Coaching Read** is core architecture. AI combines objective event-derived data with qualitative coach observations.
- Output distinguishes what the data shows, what the coach observed, synthesis, and specific items worth reviewing.
- AI must not claim the data proves a qualitative observation when the captured events cannot measure it.
- Coaching Read may offer **Targeted Practice Ideas** tied to sufficiently supported weaknesses/patterns, including floor-location-specific shooting/finishing work. Recommendations show evidence/sample context and are suggestions for coach selection, not mandates.
- A full AI-generated practice-plan builder is future scope, not Alpha.

### Overtime and rebounds
- Support configurable overtime length and multiple overtime periods.
- Rebounds support player, opponent and team/dead-ball outcomes where appropriate.

### Alpha scope
First playable Alpha prioritizes: Game Setup; responsive iPhone/iPad Game screen; core live event entry; clock/periods; bench-first substitutions and minutes; Undo/Edit; Stats; Playing Time; basic Shot Chart; Fast Break experiment; local/offline persistence; automated tests.
Full season Trends, sophisticated lineup analytics, multi-statkeeper mode, granular opponent statkeeper and polished AI coaching output may follow after the live game engine is proven, but the event model must support them now.

Primary Alpha validation question: **Can one person keep an accurate basketball game on an iPhone landscape without falling behind?**
