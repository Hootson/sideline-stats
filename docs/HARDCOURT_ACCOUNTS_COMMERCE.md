# Hardcourt Accounts + Commerce

## Current launch mode

Hardcourt is free during preview. Users choose **Stat Keeper**, create an account, create a basketball team, save a roster, and use cloud statkeeping without a Stripe checkout or trial/paywall interruption.

`hardcourt/commercial-config.js` is the client-side product switch. `paidAccessEnabled` remains `false` until the owner explicitly decides to begin charging.

## Shared Bleacher Butt Stats foundation

Hardcourt uses the existing Supabase project and shared account/team primitives used by Gridiron:

- Supabase Auth account
- `teams` with `sport = 'basketball'`
- `team_members` for owner/statkeeper/coach membership
- `seasons`
- `players` for the persistent roster
- `hardcourt_events` for basketball game events
- shared parent/viewer and coach/statkeeper invitation patterns
- shared `team_entitlements`, `team_subscriptions`, and Stripe functions for future paid access

## Preview behavior

1. User creates or signs into a Bleacher Butt Stats account.
2. User selects Stat Keeper.
3. User creates a Hardcourt team.
4. Team and active season are associated with that account.
5. Roster is saved to Supabase and restored after sign-in on another device.
6. New games reuse the saved team and roster.
7. No Stripe checkout is required while preview mode is enabled.

## Future paid behavior

Current target pricing mirrors Gridiron:

- Stat Keeper: $14.99 / team / season
- Team Pro: $39.99 / team / season
- Team Pro includes 5 coach seats

Before turning `paidAccessEnabled` on, finish edition-aware Stripe success/cancel return URLs and run the full Stripe test lifecycle. Do not enable charging merely by merging this branch.

## Database correction

The original `create_hardcourt_team` RPC inserted an `internal_test` complimentary Statkeeper entitlement for every new basketball team. That bypassed the shared commercial model. The migration `supabase-hardcourt-commercial-onboarding.sql` removes that special entitlement insert and lets the shared new-team onboarding own membership/entitlement creation.
