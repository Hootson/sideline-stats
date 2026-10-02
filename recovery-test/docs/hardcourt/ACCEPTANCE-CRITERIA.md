# Hardcourt Acceptance Criteria

This file grows feature-by-feature. An agent should not call a feature complete until its approved criteria pass.

## Foundation
- Hardcourt work is isolated from existing Gridiron production files.
- No Hardcourt setup step requires incremental paid AI/API/service spend.
- Hardcourt-specific automation cannot trigger legacy Gridiron modification workflows.

## Court
- Primary game view works in landscape phone dimensions.
- Left and right court geometry are exact mathematical mirrors.
- Offensive-half visual treatment stays inside court boundaries.
- Overlay controls do not distort court geometry.

## Field-goal entry
- First tap records exact court coordinates.
- System deterministically classifies the attempt as 2PT or 3PT from coordinates.
- Second tap selects both shooter and made/missed result.
- A made attempt updates score and player field-goal statistics exactly once.
- A missed attempt does not update score.
- Made attempts can flow to an Assist/None prompt.
- Missed attempts can flow to a Rebound/Opponent/None prompt.
- Undo can reverse the complete recorded event without leaving partial statistics.

## Offline baseline
- Ordinary stat entry works with network unavailable.
- Recorded events survive page/app restart using local persistence.
- Unsynced local events are visibly distinguishable from synchronized state.
- Reconnection does not duplicate already-synchronized events.
- Sync conflict behavior must be specified and tested before simultaneous stat keeping is enabled.

## Pre-Alpha additions
- iPhone and iPad landscape use the same Game composition and workflows; larger widths scale cleanly without court distortion.
- Product header uses Bleacher Butt Stats / Hardcourt Edition branding; team primary/accent colors theme sport-neutral UI below it with readable contrast.
- Court is programmatically mirrored and uses deterministic, forgiving 2PT/3PT hit classification near visible boundaries.
- Stats supports Game/Regular Season/Playoffs/Season Total and the basketball box-score columns defined in Decisions.
- Playing Time shows minutes, available-time percentage, status and player-minutes sanity check.
- Shot analytics preserve exact coordinates and derive team/player, period, game/selected-games/season views.
- Near-rim coordinates derive Left Rim, Center Rim and Right Rim without falsely claiming shot type.
- Heat maps distinguish frequency from efficiency and display attempt/sample context.
- Fast Break can arm the next shot, auto-clear, be canceled, and be added/removed in recent-play edit without changing ordinary two-tap shots.
- Plus/minus derives from confirmed active lineups and scoring events; unknown historical score corrections do not contaminate current-lineup +/-.
- Lineup intervals can rebuild minutes and +/- after correction.
- Overtime and team/dead-ball rebounds are representable.
- Coach Debrief and AI Coaching Read architecture can combine objective data and coach observations while clearly distinguishing their sources.
- Targeted Practice Ideas may be generated from sufficiently supported patterns and include evidence/sample context.
- Alpha can be run locally/offline without Supabase or production Gridiron changes.
- Alpha success is evaluated primarily by whether one statkeeper can keep an accurate live game on iPhone landscape without falling behind.
