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
