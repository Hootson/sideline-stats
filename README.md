# Sideline Stats V3.7.2

## Share-image pagination
The Player Box Score no longer uses one fixed-height image that can clip long stat sheets.

- The app calculates how many Player Box Score images are needed.
- Tables split only between player rows.
- Table headings repeat when a table continues onto the next page.
- Every page has `PAGE X OF Y`.
- The Share sheet receives the Team Summary plus every Player Box Score page.
- Rushing, Passing, Receiving, Defense, Special Teams, and Penalty Summary are included.
- Receiving now includes targets, drops, and catch percentage in the shared box score.

This is designed for full youth rosters and games where many players accumulate stats.

## Share-image header redesign
Team Summary, Player Box Score, and Snap Participation Report now use the same
broadcast-style visual system:

- stronger team primary/accent color treatment
- angled graphic layers
- Sideline Stats / Gridiron Edition branding
- clearer matchup/score hierarchy
- team and opponent logos when available
- compact repeated header on continuation pages

## V3.7.1 fixes retained
- Offensive stats-table rendering fix
- Active-game stats source fix
- Edit Game Details
- Optional opponent logos
