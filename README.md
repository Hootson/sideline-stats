# Sideline Stats V1.2 — Team Tools Build

## Fixed
- **Share Stats** is restored. Two stale JavaScript listeners from an old Share screen were stopping the later share handler from loading.

## Roster Import / Export
Roster screen now includes:
- Export Roster
- Import Roster

The exported `.json` roster can be saved, sent to another parent, or imported after resetting test data.

## Snap Tracker
New bottom tab: **Snaps**

Workflow:
1. Choose the game.
2. Mark the current players ON FIELD.
3. Tap Record Snap.
4. The lineup stays selected for the next snap.
5. Only change players when substitutions happen.

Features:
- Running snap count by player
- 10-snap minimum progress
- "10+ MET" indicator
- Undo last snap
- Select All / Clear All
- Share / Export Snap Report as CSV

Snap data is stored with each game.

### Multi-device note
The current GitHub prototype stores data locally on each device. A second parent can import the roster and independently run Snap Tracker on their own phone, but their snap counts do not yet sync into the primary statkeeper's phone. True shared-team, multi-device syncing requires the production cloud/backend phase.

## New Season purchase flow
Changing the team season now shows a **prototype purchase/unlock prompt** so we can test the user experience.

It does NOT charge money. Real season purchases should be implemented later using Apple/Google in-app purchasing after the production app/backend exists.

## GitHub
Replace:
- index.html
- manifest.webmanifest

in the same repository and commit to `main`.
