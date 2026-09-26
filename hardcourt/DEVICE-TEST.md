# Hardcourt account persistence — device test

Use this checklist before merging the account/commerce branch to `gh-pages`.

## Safety gates
- Paid access must remain disabled.
- Do not enter Stripe checkout during this test.
- Existing Gridiron auth/session must remain unaffected.

## Fresh-account path
1. Open Hardcourt in Safari with no Hardcourt session.
2. Create/sign into a Bleacher Butt Stats account and select **Stat Keeper**.
3. Confirm no payment or checkout is requested.
4. Create the basketball team and enter team name, grade, colors, and logo.
5. Enter a roster with at least 6 players and jersey numbers.
6. Wait a few seconds for cloud persistence.
7. Close the tab/app, reopen Hardcourt, and sign in if required.
8. Confirm the same team profile and roster restore automatically.

## New Game path
1. From the restored team, choose **New Game**.
2. Confirm the roster remains intact and is available for starters/substitutions.
3. Confirm game-specific state is fresh: opponent, score, clock/events and game ID should not carry over incorrectly.
4. Enter a few test events, leave the app, reopen, and confirm the current game remains usable.

## Returning/multi-device path
1. Sign into the same Hardcourt account on a second browser/device.
2. Confirm the saved team and roster are restored from Supabase rather than requiring re-entry.
3. Edit one player's name/number on device A.
4. Reopen/refresh device B and confirm the edit appears.

## Isolation path
1. Sign out of Hardcourt.
2. Confirm this does not sign the user out of Gridiron.
3. Sign back into Hardcourt and confirm team/roster restoration still works.

## Pass criteria
The account milestone passes when all four paths work without roster loss, duplicate teams/players, checkout prompts, or regressions to the existing Hardcourt Game screen/stat-entry workflow.
