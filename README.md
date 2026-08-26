# Sideline Stats V2.5 — Special Teams Fix

Fixes Special Teams aggregation for the newer play-entry flows.

Now counted correctly:
- Kickoff Return → KR + KR yards for the selected returner
- Punt → punt + punt yards for the selected punter
- Punt Return → PR + PR yards
- Kickoff events → team-level kickoff count

The Stats tab now includes:
- Kickoffs
- Kick Returns
- Punts
- Punt Returns
- Player-by-player KR / KR YDS / PR / PR YDS / PUNT / PUNT YDS
- Team totals

The shareable stats image also includes the Special Teams player table when special-team stats exist.

All V2.4 game/down/possession/share behavior is retained.
