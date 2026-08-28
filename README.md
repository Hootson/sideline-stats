# Sideline Stats V3.7.9

This build corrects the rendering mistake in V3.7.7/V3.7.8.

## Receiving
The Stats screen now calls a dedicated receivingView() renderer.
On iPhone, Receiving is presented as player cards rather than a nine-column table:
- Player + receiving yards header
- TGT, REC, AVG, 1D, TD, DROP, CATCH
- Team Total card below the players
- no horizontal clipping

Desktop/tablet still receives the full table.

## Share header
The header is substantially redesigned:
- split SIDELINE / STATS wordmark with accent-colored STATS
- Gridiron Edition badge
- larger protected logo panels
- town and mascot typography separated
- italic sports-style mascot and score typography
- tighter central scoreboard
- dedicated grade badge
- simplified metadata strip

Stat calculations and pagination are unchanged.
