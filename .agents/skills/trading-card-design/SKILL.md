---
name: trading-card-design
description: Design, templatize, implement, and QA dynamic Bleacher Butt Stats trading cards across Gridiron, Hardcourt, hockey, and future editions. Use when creating or changing card fronts/backs, dynamic team-color templates, player photos, game/season stat summaries, QR/marketing areas, social sharing, or card rendering in parent/viewer experiences.
---

# Bleacher Butt Stats Trading Card Design Skill

## Purpose
Build collectible-looking player cards that are visually strong, data-correct, sport-aware, reusable across teams, and easy to share. Preserve the Bleacher Butt Stats umbrella brand while allowing each sport edition to have its own visual personality.

The core lesson from the Gridiron build: separate the **art/template**, **dynamic overlays**, **sport data adapter**, and **share behavior**. Do not bake dynamic content into the master artwork.

## Non-negotiable workflow

1. **Inspect before changing.** Find the currently active card renderer, template asset, parent/viewer loader, release query strings, team-color source, data fields, and share path. Do not assume the newest-looking file is the one actually loaded.
2. **Do not generate a new image unless explicitly requested.** If the user says to chat, code, align, or use an attached design as a reference, preserve the approved art and work in code.
3. **Lock geometry before data.** First approve aspect ratio, border/frame, photo window, score/matchup area, stat-summary region, and marketing/footer region. Then add dynamic content.
4. **Use a clean master template.** Remove player names/numbers, opponent names, scores, dates, cities, stats, and other variable content from the artwork. Only truly static labels/art belong in the image.
5. **Overlay dynamic content in code.** Player photo, team/opponent, score, status, stat tables, commentary, QR code, and dynamic colors are rendered at runtime.
6. **Version every visible change.** Update the implementation file AND every loader/cache-busting query string that references it. A code change that the browser does not load is not complete.
7. **Verify after pushing.** Re-fetch the loader and implementation to confirm the correct release is referenced. When practical, test with a known real game/player whose expected values are known.
8. **Make small surgical passes.** Once an area is approved, do not casually alter it while changing another area.

## Architecture

Prefer four layers:

- `template artwork`: static distressed card, framing, texture, fixed headings, brand treatment.
- `card renderer`: coordinates, typography, image crop, wrapping, colors, stat tables, QR.
- `sport adapter`: converts raw play/game data into a normalized card summary.
- `viewer/share integration`: loads the renderer, supplies player/game/team data, exports/shares the card.

For a new sport, reuse the renderer concepts but create a sport-specific adapter rather than stuffing basketball/hockey conditions into football calculations.

## Coordinate system

Use a canonical card coordinate system based on the master template dimensions. Scale at runtime:

- `sx = renderedWidth / masterWidth`
- `sy = renderedHeight / masterHeight`

Keep important alignment values in named constants/objects rather than scattered magic numbers. When tuning visually, use a temporary coordinate/grid overlay. Remove or disable debug grids when finished.

Treat user instructions such as “move up two ticks,” “x=45 to 88,” or “rotate +3°” as precise layout adjustments. Change only the requested geometry unless another change is required to prevent clipping.

## Card proportions and layout

Preserve the approved trading-card aspect ratio. Never let a replacement template silently make the card shorter/taller.

The back does **not** need the same border as the front. It should feel like the same card set through texture, palette, typography, distressing, and motifs while being purpose-built for information.

Keep marketing subordinate to the collectible card. The footer should span the card width but remain shallow; it should not consume roughly a third of the card. Marketing should support the card, not become the focal point.

## Player photo handling

The master template photo region should be transparent/open, not a fake black placeholder. Render the player photo beneath/through that window.

Use cover-style cropping and store a crop transform when possible:

- scale/zoom
- x offset
- y offset

Support pinch/zoom or equivalent crop adjustment in the UI when the product allows it. Never permanently rasterize a user photo into the shared master template.

## Dynamic team colors

Cards must work for arbitrary teams. Read `primary` and `accent` colors from team configuration and apply them consistently to both front and back.

Do not recolor everything indiscriminately. Preserve paper/cream, black, white, distress texture, and photographic content. Recolor only intentional template color channels or code-rendered elements.

Test at least:

- original Erie black/orange
- a clearly different primary/accent combination
- light accent
- dark accent

Footer/marketing artwork is part of this test; do not forget it.

## Typography and wrapping

Use strong sports-card typography, but prioritize legibility on a phone screenshot.

For variable team/opponent/player text:

1. Define left/right boundaries.
2. Try the preferred font size.
3. Shrink only to a sensible minimum.
4. If still too wide, wrap to two lines.
5. If wrapping changes the visual balance, reduce adjacent score size modestly rather than allowing overlap.

Do not let long opponent/team names escape their designated region.

Use accent highlights sparingly. A useful pattern is an accent rule across the top of stat tables plus an accent category block/edge.

## Blank and zero values

Distinguish **not applicable/no recorded stat** from a true numeric zero. For card display, use `—` for blank/unavailable fields rather than leaving an empty hole. Use `0` when zero is an actual recorded result.

## Game header

A game card back should generally show:

- final/live status
- team vs opponent
- final score
- no unnecessary date/city if the design is cleaner without it

Matchup labels may follow an angled banner, but define fixed left/right boundaries and fit/wrap inside them.

## Dynamic stat summary

Use compact box-score tables, not prose-only stat dumps. Only render categories in which the player has meaningful participation.

### Gridiron reference categories

Passing: `CMP/ATT | YDS | AVG | TD | INT | FUM | RATE`

Rushing: `CAR | YDS | AVG | TD | FUM`

Receiving: `TGT | REC | YDS | AVG | TD`

Defense: `TKL | TFL | SACK | INT | FF | FR`

Do not include `1D` on the card tables.

Keep table row height fixed. A player with only Defense should not get one enormous stretched Defense table.

### Football passer rating

Use the standard NFL passer-rating formula and count **true pass attempts only**. Sacks are not pass attempts. Clamp each component to 0–2.375 and display the final rating on the 0–158.3 scale, usually to one decimal.

Validate calculated stats against a known player/game before declaring them correct. A mathematically correct formula with the wrong raw event mapping is still wrong.

## Sparse-player cards and team contribution

Do not punish linemen or low-stat players with an empty card.

If a player has **2 or fewer individual stat tables**, use the remaining Game Summary space for team context. Include both offensive and defensive team contribution where data permits.

Useful factual lines include:

- total/rushing/passing team yards
- offensive TDs and team points
- points allowed / shutout
- opponent total/rushing/passing yards
- sacks
- takeaways

Add stock commentary to make the area feel complete, but keep it team-oriented and supported by game data. Do not falsely attribute team outcomes to the individual player.

Examples of safe dynamic commentary patterns:

- offense moved the ball and created scoring opportunities
- ground game helped set the tone
- passing game stretched the field
- defense limited scoring opportunities
- defense kept the opponent off the board
- pressure disrupted the opponent
- turnovers created extra possessions
- pursuit, tackling, blocking, execution, and assignment football mattered

Contribution boxes should expand vertically into available space. Use larger typography than ordinary stat labels so sparse cards still feel intentionally designed rather than empty.

For basketball/hockey, create sport-specific equivalents using the same principle: individual box score first, team/game context second.

## Special events

If a rare event does not fit cleanly into the normal table (for example a special-teams TD), a short factual sentence beneath the tables is acceptable. Keep it concise.

## Bleacher Butt Stats umbrella branding

The card should market **Bleacher Butt Stats**, not only one sport edition. Sport identity can appear elsewhere in the app/link destination.

Footer goals:

- shallow full-width marketing strip
- Bleacher Butt Stats umbrella mark integrated into the background, not pasted awkwardly on top
- QR space contained cleanly within the strip
- CTA such as `Scan to keep stats for your team`
- visual weight clearly below the player/game content

Do not let the logo escape its designated footer region.

## QR and sharing behavior

The QR code and clickable share link solve different situations.

- QR: useful when the card is viewed on another device or in print.
- clickable link: essential when the card itself is already on the viewer's phone screen.

For Bleacher Butt Stats marketing cards, the QR/link should go to the umbrella landing site/team-start funnel, **not** to the private/live parent stats page unless explicitly requested.

When using native sharing, include the image plus share text/title/link when supported. Verify platform behavior separately for text, Facebook/Instagram workflows, and downloaded-image-only workflows; an image itself does not magically contain a clickable hyperlink.

## Front/back consistency

The front and back should belong to the same set, not be clones. Maintain consistency through:

- distress level
- paper/texture
- palette
- type family/attitude
- corner treatment
- recurring motifs

Allow the back to use a different border optimized for score/stat information.

## New-sport kickoff: Hardcourt or Hockey

Before designing a new sport card, establish:

1. front-card visual theme and canonical aspect ratio
2. back-card information hierarchy
3. sport-specific stat categories and derived metrics
4. sparse-player/team-context rules
5. special-event callouts
6. team-color mapping
7. photo crop behavior
8. umbrella footer/QR treatment
9. game vs season card behavior
10. share destination and share copy

Reuse the proven architecture and interaction patterns. Do **not** blindly reuse football category names, formulas, or commentary.

### Suggested Hardcourt starting categories

Choose from data actually tracked: scoring/shooting, rebounds, assists/playmaking, defense, turnovers/fouls, and playing time. Prefer compact categories that tell a player's game story rather than displaying every available field.

### Suggested Hockey starting categories

Choose from data actually tracked: goals/assists/points, shots, faceoffs if tracked, hits/blocks/takeaways, penalties, goalie stats where applicable, and time-on-ice if tracked. Skater and goalie card summaries should be separate schemas.

## QA checklist before calling a card solid

Check all of these:

- correct aspect ratio
- approved template asset is actually being used
- front/back team colors both update
- footer colors update
- photo is not blocked by opaque template pixels
- crop/zoom works and survives redraw/share
- short and long team names fit
- score is centered and not crowded
- blanks render as `—`
- stat categories appear only when appropriate
- derived metrics use correct source events
- sparse players receive useful team context
- commentary does not invent player contribution
- accent rules/headers render consistently
- QR scans to the intended destination
- share link points to intended destination
- card remains readable on phone
- release query string points to newest implementation
- hard refresh does not revert to an older cached card
- known test player/game produces expected values

## Cache/version failure prevention

A recurring failure mode is: implementation was updated, but the viewer still loads the previous `?release=` value.

Every push that changes card rendering must include this check:

1. update renderer release/version
2. update template asset release if needed
3. update parent/viewer `<script src=...release=...>`
4. fetch the parent/viewer file after the push
5. confirm the new release string is present
6. only then tell the user the update is ready

## Change discipline

When the user says an area is PERFECT/solid/approved, treat it as locked. Later changes should not touch it unless required or explicitly requested.

Maintain a short list of locked regions during a design session, for example:

- aspect ratio: LOCKED
- upper matchup/score: LOCKED
- footer: LOCKED
- Game Summary: ACTIVE

This prevents regressions such as reverting to an old frame while editing a different section.

## Communication

When asked to code, code. When asked to chat, do not generate an image or push code. When asked for a visual, distinguish between a disposable concept mockup and the actual reusable master template.

After a code push, report only what changed, the release/version, and what the user should visually verify. Never claim the update is visible until the active loader references the new version.
