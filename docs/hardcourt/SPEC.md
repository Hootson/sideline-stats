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

## Two-tap field goal requirement
A standard field-goal attempt must record shooter, exact location, 2PT/3PT status, and make/miss in two taps:
1. Tap the shot location on the offensive half.
2. Tap MADE or MISS beside the shooter in the active-player popup.

2PT/3PT is inferred from court coordinates.

After the two-tap record:
- Made shot -> optional Assist prompt using the other active players plus None.
- Missed shot -> optional Rebound prompt using active players plus Opponent plus None.

The follow-up is not part of the literal two-tap field-goal claim.

## Court geometry
Define one half-court geometry once and mathematically mirror it. The menu may overlay court lines but must never alter the underlying geometry.

## Substitutions and minutes
The active lineup is explicitly tracked. Substitution controls update the five on-court players. Playing time accumulates from active lineup state and game-clock state.

## Reliability
The statkeeper must be able to record ordinary game events without network access. Local state is authoritative for unsynced game-day actions until safely synchronized.

## Collaboration
Support a simple single-statkeeper workflow first while preserving an architecture capable of optional simultaneous stat keeping. A future two-person mode may split responsibilities such as shots/scoring/assists and rebounds/steals/blocks/turnovers/fouls/substitutions.

## Still to specify before feature implementation
Free throws; detailed foul flow; turnover/steal relationships; rebounds and blocks; opponent-detail level; clock correction; undo/edit behavior; period transitions; timeout rules; live viewer behavior; simultaneous conflict resolution; analytics definitions; Basic vs Pro packaging; final pricing; voice entry.
