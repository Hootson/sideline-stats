# Sideline Stats V3.10.2

Sideline workflow expansion focused on branching from the event that happened while keeping entry simple.

## New tracking
- Post-touchdown point-after workflow: 2-point kick, run, pass, or no try; player attribution and good/no-good result.
- Pass defended credit after opponent incomplete passes.
- Defensive interception/fumble-recovery return yards before return TD/no-TD outcome.
- Our kickoff now records kicker, result (touchback/returned/out of bounds/onside), and kick yards when applicable.
- Prominent next-quarter control; all generic recorded plays now explicitly store the active quarter.
- Excel Plays/Player Game Stats/Special Teams exports include the new structured fields.
- Defense stats include PD.

Existing backups remain compatible. Legacy 1PT/2PT extras remain readable/scored.

- V3.10.1: Adds official NFL passer rating to passing box scores, team summaries, shareable stats, and analytics export. Pass attempts used for passer rating exclude sacks.
- V3.10.2: Live-test UX cleanup: yardage wheels default to 0, offensive fumbles branch to OUR TEAM / OTHER TEAM recovery, defensive prompt wording updated, all branched play-entry screens auto-scroll into view, temporary selections reset between plays, and unselected player/yardage controls use a polished neutral visual treatment.
