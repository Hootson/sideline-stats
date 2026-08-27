# Sideline Stats V3.0

Major build combining the next-version roadmap.

## Data safety
- Permanent storage key from this version forward
- Auto-save after each action
- Local recovery copy before each save
- Backup Team Data / Restore Backup
- Export Roster / Import Roster

## Down & Distance
- Current down + yards-to-go shown between the down selector and play entry
- Distance updates automatically for our rushes and completed passes
- First downs / turnovers / punts / kickoffs reset to 1st & 10
- Manual +/- and direct distance correction
- New plays store possession, down and distance at play start for analytics

## Defensive touchdowns
- INT or Fumble Recovery asks whether it was returned for a TD
- Yes adds 6 points automatically

## Team analytics
- Offensive plays / defensive plays / total scrimmage plays / special-teams plays
- Total offense and yards per play
- Rush/pass split
- First downs
- Turnovers, takeaways and turnover margin
- Explosive 10+ and 20+ plays
- Longest rush/pass/kick return
- Completion percentage and passing TD/INT
- TFL, sack and takeaway rates
- Snap compliance / tracked snap opportunities

## Sharing
Share Stats now sends two images:
1. Team Game Summary with derived team analytics
2. Detailed Player Box Score

Works for game, regular season, playoffs and full season.

## Analytics export
- Export Excel Analytics (.xlsx when SheetJS is available)
- Export Raw JSON
- Excel sheets: Games, Plays, Player Game Stats, Team Game Stats, Snap Counts, Snap Records, Special Teams, Season Totals, Data Dictionary
- Snap Tracker data included at per-game summary and raw player-per-snap level

## New-season purchase prototype
Changing an existing team's season prompts that a new season purchase will be required in the production app; test mode can continue.
