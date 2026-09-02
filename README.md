# Sideline Stats V3.9.8

Excel/raw analytics export alignment release.

## Plays sheet
The Plays sheet now exports the structured defensive events that drive the current in-app stats:
- ForcedFumble + ForcedFumblePlayer
- FumbleRecovery + FumbleRecoveryPlayer
- DefensiveInterception + InterceptionPlayer
- DefensiveTD + DefensiveTDPlayer
- Takeaway
- Giveaway
- TurnoverMarginImpact
- TackleKind
- DefensiveCredits

Column O remains `Subtype`. For a compound defensive play it now includes all meaningful defensive events (for example `Opponent Run + Forced Fumble + Fumble Recovery + Defensive TD`) so Fumble Recovery is once again directly visible in the same column used by older exports. `RawSubtype` preserves the original stored subtype.

## Stat alignment
- `FirstDown` uses the same derived first-down function as the Rushing, Passing, Receiving and Team Summary stats.
- `Touchdown` includes defensive return touchdowns.
- `Takeaway` uses the same fumble-recovery/interception logic as Team Summary turnover margin.
- Summing `TurnoverMarginImpact` by game matches Team Game Stats `turnoverMargin`.
- Player Game Stats remain generated from the same `agg()` function used by the on-screen player stat tables.

The Data Dictionary sheet documents the new fields for dashboard/AI consumers.
