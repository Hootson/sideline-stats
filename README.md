# Sideline Stats V3.9.3

First-down stat fix:
- Offensive first downs are now derived from the actual play state: yards gained >= distance needed.
- Touchdown plays can also receive first-down credit when they reached/passed the line to gain.
- Rushing 1D, passing 1D, receiving 1D, and Team First Downs all use the same derived logic.
- Existing saved plays are fixed retroactively at stats-calculation time; they do not need to be re-entered.
- The play state engine now also preserves/adds "1st Down" on qualifying TD plays instead of stripping it.
- V3.9.2 selection highlighting, V3.9.1 compound defense, snap persistence, share/export, and backup compatibility remain intact.
