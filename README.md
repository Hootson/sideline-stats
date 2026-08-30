# Sideline Stats V3.9.5

This build includes the next-game fixes requested after live testing:

- Defensive fumble-recovery and interception return touchdowns automatically add +6 to our scoreboard.
- Score-model migration preserves an already manually corrected score, preventing an older defensive TD from suddenly adding another +6 after update.
- Turnover margin now counts structured `fumbleRecoveryPlayerId` and `interceptionPlayerId` takeaways used by the newer compound defensive workflow.
- Legacy `INT` and `Fumble Recovery` plays remain compatible.
- Defensive TD attribution remains tied to the actual returner and appears in the Defense TD column.
- Fumble recoveries and interceptions can continue to Return TD +6 / Nothing Else.
- Exact yardage entry now uses native iPhone-friendly signed scroll pickers (-99 through +99) instead of requiring a keyboard minus sign.
- Quick yardage buttons remain available for fast entry.
- Share-score surfaces use the same calculated score as the live scoreboard.

Core rule remains: You enter the play. Sideline Stats derives the stats.
