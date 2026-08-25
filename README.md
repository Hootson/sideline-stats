# Sideline Stats V0.6 — Full-Screen iPhone Sharing

## Share output redesign
Share Game Stats now creates phone-shaped 1170 × 2532 PNG pages with much larger type.

The output starts with:
- Game score
- Game Leaders
- Team Totals

Then it creates separate full-screen pages only for categories that have stats:
- Rushing
- Passing
- Receiving
- Defense
- Special Teams

Each category is player-by-player and includes a TEAM TOTAL row.

If a category has too many players to remain readable, the app automatically creates another page instead of shrinking the text.

This is intentionally more pages than V0.5. The goal is that when a parent receives the images in Messages and taps one, the page is already sized like an iPhone screen and the text is readable without pinch-zooming.

## Existing features retained
- Automatic TD +6, PAT +1, 2PT +2 scoring
- Manual score correction
- Persistent data
- Delete game
- Reset all data
- Existing V0.2–V0.5 data migrates forward

## GitHub update
Replace:
- index.html
- manifest.webmanifest

in the SAME sideline-stats repository and commit to main.
