# Sideline Stats V3.5

New in V3.5
- Share Participation Report directly from the Snaps tab.
- Participation image uses the team's Primary + Accent colors and is sized for iPhone sharing.
- Report shows each player's 10-snap requirement, total snaps, and MET / NEEDS status.
- Special Teams now includes Forced Fumble and Fumble Recovery.
- Special-team FF/FR are credited to the selected player and included in stats/export.
- All normal roster player selectors are capped at 3 columns and scroll vertically.
- Penalty "Who was it on?" now uses the same 3-column player-selection design.
- Down/distance math explicitly supports signed yardage: new distance = old distance - yards gained.
  Example: 2nd & 10 with a -5-yard completed pass becomes 3rd & 15.
- Automatic first downs remain derived from distance-to-go.
- Penalty Summary appears below Special Teams.
- Backup files now include backupVersion and appVersion metadata while older backups remain restorable.

Retained
- Offline PWA support
- Custom Home Screen icon
- Reset All Data fix
- Manual possession switch fix
- Existing roster/games/season data model

Upload these files to the same GitHub Pages repository:
- index.html
- manifest.webmanifest
- service-worker.js
- icon.png
- README.md (optional)
