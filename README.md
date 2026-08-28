# Sideline Stats V3.7.1

## Critical fix
V3.7 had an undefined `fmt1()` formatting helper in the receiving-table render path.
As soon as a receiving stat existed, the Stats screen threw a JavaScript ReferenceError
before replacing the stat tables. This could leave an older Special Teams table visible
while rushing, passing, and receiving appeared blank.

V3.7.1 defines the missing formatter and keeps the active game selected when opening Stats
or recording a play.

## Verified against the supplied Erie Tigers backup
Expected current-game offense:
- Bradyn: 1 carry, 6 yards
- Bryce: 1 carry, 7 yards
- Abe: 2 completions on 3 attempts, 22 passing yards
- Cohen: 1 target, 1 reception, 7 yards
- Easton: 1 target, 1 reception, 15 yards
- Colter: 1 target, 0 receptions, 1 drop
- Kallum: 1 kickoff return, 15 yards

## Edit Game Details
From an open game, tap **Edit Game Details** to change:
- Team name (updates the team globally)
- Opponent
- Week
- Home / Away / Neutral
- Regular Season / Playoff
- Optional opponent logo

Saved games also have an **Edit** button. Existing plays, snaps, and scores are preserved.

## Opponent logos
Opponent logos can be added when starting a game or later from Edit Game Details.
They display on the live scoreboard and on the two game-stat share images.
