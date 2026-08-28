# Sideline Stats V3.7.4

## Critical logo fix
V3.7.3 called `loadImg()` in the share-image renderer but never defined that function.
The error was caught silently, which meant uploaded team and opponent logos could not render.

V3.7.4 adds a real image loader and preserves the saved `logoData` / `opponentLogoData`.

## Share header rebuild
The share-image header was rebuilt to much more closely follow the approved mockup:
- large uploaded team logo in the left side panel
- large uploaded opponent logo in the right side panel
- team and opponent names separated from the scoreboard
- dynamically shrinking long team names to prevent collisions
- centered score / FINAL-LIVE shield
- black broadcast-style background and angled team-color panels
- Sideline Stats / Gridiron Edition branding
- bottom info strip shows only Week, Home/Away/Neutral, Regular Season/Playoffs

Date and city/location remain removed.

Player Box Score pagination remains intact.
