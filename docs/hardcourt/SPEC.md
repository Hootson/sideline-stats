# Bleacher Butt Stats: Hardcourt Edition — Product Specification

Status: foundation draft. Product decisions must be approved before implementation when this document is silent.

## Product goal
A fast, reliable youth basketball game-day statistics system combining extremely quick stat entry, live team viewing, useful coach analytics, and strong offline reliability.

## Primary game-day format
One responsive landscape game interface for iPhone and iPad, designed to preserve the same composition, controls and tap sequences while scaling cleanly to available width.

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
Hardcourt uses a bench-first lineup model. At game start, the statkeeper identifies the players visibly sitting on the bench; all unselected eligible roster players are derived as the active five.

During a substitution, the existing bench selections reopen. The statkeeper may toggle only the players whose bench status changed or use Clear Bench and reselect everyone visibly on the bench. Confirm is allowed only when the resulting eligible active lineup is valid for the game.

A substitution is committed at the instant the statkeeper taps Confirm. Until that instant, the previously confirmed active lineup continues accruing playing time even if the game clock is running. Editing/clearing selections inside the substitution panel must never retroactively alter minutes. On Confirm, the previous lineup interval closes at the current game-clock value and the newly derived active five begin accruing time immediately if the clock is running.

This behavior intentionally supports youth-basketball running clocks and on-the-fly substitutions. If the game clock is stopped for a timeout/referee stoppage, lineup changes can be confirmed without any player accumulating additional playing time while the clock is stopped.

Playing time is derived from confirmed lineup intervals plus clock/period state, not from the amount of real-world time a substitution popup remains open. Clock corrections must rebuild affected playing-time calculations rather than permanently drifting.

Hardcourt must provide a coach-facing playing-time report/share view analogous in purpose to Gridiron's snap-count output: roster sorted from most playing time to least, showing each player's total game minutes and enough game context for a coach to compare participation. Percent of available game time may also be derived.

## Clock and periods
Game setup must support at least two period structures:
- four quarters;
- two halves.

Period length must be configurable so youth leagues with different game lengths are supported.

The main game screen has a highly accessible Start/Stop Clock control. The displayed Hardcourt clock is the source used for event timestamps and playing-time calculations. Youth basketball commonly uses a running clock, so ordinary stat entry and substitution editing must not implicitly stop the clock. A timeout/referee stoppage can stop the clock explicitly.

At a quarter/half transition, advancing to the next period updates the period label and resets/sets the configured period clock as appropriate. When teams change attacking direction, Hardcourt flips the offensive side: the highlighted offensive half, contextual shot-entry side and control-menu side mirror together. The underlying court geometry remains mathematically symmetric.

The app should preserve enough clock/period history to correct a clock mistake and deterministically rebuild event timing, lineup intervals and player minutes.

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


## Pre-Alpha implementation contract — September 20, 2026
Implementation must also follow the locked additions in `DECISIONS.md`, including cross-sport Gridiron inheritance for sport-neutral behavior, Bleacher Butt Stats branding plus configurable team primary/accent theming, responsive iPhone/iPad layout, exact center-court logo asset use, programmatic mirrored court geometry and forgiving touch classification.

The event model must preserve exact shot coordinates and support derived rim-side zones (left/center/right), fast-break tagging, team/dead-ball rebounds, overtime, lineup plus/minus, shot/heat-map analytics, Coach Debrief context and future Targeted Practice Ideas without adding ordinary game-day taps.

The first playable Alpha is deliberately narrower than the complete analytics vision. Build the live game engine, responsive Game UI, setup, core entry, clock, substitutions/minutes, corrections, Stats, Playing Time, basic Shot Chart, Fast Break experiment, local persistence and tests before production backend integration.
