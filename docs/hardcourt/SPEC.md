# Sideline Stats: Hardcourt Edition — Product Specification

Status: foundation draft. Product decisions must be approved before implementation when this document is silent.

## Product goal
A fast, reliable youth basketball game-day statistics system combining extremely quick stat entry, live team viewing, useful coach analytics, and strong offline reliability.

## Primary game-day format
Landscape phone orientation, designed to be held like a game controller.

## Core game screen
- Scoreboard across the upper area.
- Full basketball court as the primary interaction surface.
- Offensive half visually highlighted and flipped with direction of play.
- Stat/game-control panel overlays the non-offensive half without changing court geometry.
- Five on-court player controls along the bottom.
- Navigation for Stats, Plays, Lineups, Shot Chart and Trends.
- Game clock, quarter, team fouls, timeout controls, sync/live status and settings.

## Event model
Every game action is stored as an immutable event with a unique client-generated ID, game ID, period, game-clock value, statkeeper/device identity, creation time, sync state and event-specific payload. Corrections do not silently mutate statistical history; they replace/reverse an event through the correction layer so totals can be rebuilt deterministically.

Derived box-score totals, score, lineup minutes, shot charts and analytics are computed from the event stream rather than maintained as unrelated counters.

## Two-tap field goal requirement
A standard field-goal attempt must record shooter, exact location, 2PT/3PT status, and make/miss in two taps:
1. Tap the shot location on the offensive half.
2. Tap MADE or MISS beside the shooter in the active-player popup.

2PT/3PT is inferred from court coordinates.

After the two-tap record:
- Made shot -> optional Assist prompt using the other active players plus None.
- Missed shot -> optional Rebound prompt using active players plus Opponent plus None.

The follow-up is not part of the literal two-tap field-goal claim.

## Basketball stat events
The v1 event vocabulary must be able to represent:
- Field-goal attempt: shooter, coordinates, inferred 2PT/3PT, made/missed.
- Free throw: shooter, made/missed and attempt context when known.
- Assist: credited player linked to the made field goal.
- Rebound: player or opponent; offensive/defensive classification derived where possible from possession/shot context.
- Turnover: charged player or team.
- Steal: credited player and linked to an opponent turnover when applicable.
- Block: credited player and linked to the opponent shot attempt when applicable.
- Foul: charged player/team, foul category, and resulting free-throw context when applicable.
- Substitution/lineup change.
- Timeout.
- Period start/end and clock corrections.
- Score correction when the tracked event history cannot fully explain an official-score difference.

## Chained-event principle
Basketball actions frequently imply the next likely statistic. Hardcourt should use short follow-up prompts rather than forcing the statkeeper back through a menu.

Examples:
- Made field goal -> Assist? / None.
- Missed field goal -> Rebound? / Opponent / None.
- Turnover -> Steal? / None.
- Blocked shot -> preserve the shot attempt and allow rebound resolution.
- Shooting foul -> flow directly into the appropriate free-throw sequence.

A follow-up may be dismissed when the statkeeper cannot confidently assign the secondary statistic. Speed and correctness take priority over forcing complete attribution.

## Free throws
Free throws are recorded as individual attempts so makes, misses and percentages remain reconstructable. The interaction should minimize taps by keeping the shooter selected through the sequence and presenting the expected number of attempts. The exact UI and handling of unusual youth-league rules remain PRODUCT DECISION REQUIRED before implementation.

## Fouls
Hardcourt must support player fouls and team-foul totals. Foul entry should allow the common game-day path to remain fast while preserving a route for less-common foul categories. Bonus/double-bonus behavior must be configurable by game/ruleset rather than hard-coded to one league.

Exact foul categories and youth rulesets remain PRODUCT DECISION REQUIRED.

## Substitutions and minutes
The active lineup is explicitly tracked. Substitution controls update the five on-court players. Playing time accumulates only while the game clock is running and the player is marked on court.

Lineup intervals are derived from clock/period state plus lineup-change events. Clock corrections must cause affected playing-time calculations to be rebuilt rather than permanently drifting.

## Clock and periods
Game setup must eventually define period structure and duration rather than assuming one universal basketball ruleset. Starting/stopping the game clock must be extremely accessible from the main game screen.

The app should timestamp stat events with the displayed game clock. Exact clock automation, horn behavior and supported rulesets remain PRODUCT DECISION REQUIRED.

## Undo and correction
Undo must reverse the most recent logical action, including linked secondary statistics when appropriate. Example: undoing a made field goal with an attached assist removes both the basket and that linked assist.

Completed-game editing must preserve an auditable event history and then recompute derived statistics.

## Opponent tracking
Hardcourt must always support opponent team score and enough opponent context to classify our team's defensive events correctly. Full player-by-player opponent stat keeping is optional product scope and remains PRODUCT DECISION REQUIRED.

## Court geometry
Define one half-court geometry once and mathematically mirror it. The menu may overlay court lines but must never alter the underlying geometry.

## Reliability and synchronization
The statkeeper must be able to record ordinary game events without network access. Local state is authoritative for unsynced game-day actions until safely synchronized.

Each event uses a stable client-generated ID so retries are idempotent and cannot create duplicate statistics. Sync status is tracked per event. Cloud acknowledgement must never be interpreted as permission to discard the local game history.

## Collaboration
Support a simple single-statkeeper workflow first while preserving an architecture capable of optional simultaneous stat keeping. A future two-person mode may split responsibilities such as shots/scoring/assists and rebounds/steals/blocks/turnovers/fouls/substitutions.

Simultaneous mode must use event-level synchronization rather than whole-game snapshot overwrites. Conflict rules must be specified and tested before the feature is enabled.

## Live viewer
Viewer state should be derived from synchronized game events/current game state and must never write statkeeper game data. The viewer experience should favor the current live game while preserving access to prior games and stats.

Permanent team access versus per-game sharing and viewer identity/analytics remain product decisions.

## Analytics foundation
Because the source of truth is event-level data, Hardcourt should be able to derive:
- traditional box score;
- shot chart and shooting zones;
- lineup minutes and plus/minus;
- scoring timeline/play-by-play;
- team/player trends;
- possession-oriented metrics when the captured data is sufficient.

Advanced metric definitions must document their formulas and required inputs before implementation.

## Still to specify before corresponding feature implementation
Detailed free-throw interaction; foul categories/rulesets; full opponent tracking scope; clock correction UX; period/ruleset defaults; timeout rules; live-viewer identity/sharing; simultaneous conflict resolution; analytics definitions; Basic vs Pro packaging; final pricing; voice entry.
