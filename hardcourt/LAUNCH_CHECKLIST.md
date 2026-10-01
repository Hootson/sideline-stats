# Hardcourt Edition — Production Launch Checklist

This checklist is intentionally short and operational. Code is not considered launched until the deployed customer path is verified.

## 1. Pre-merge gate
- [ ] `Hardcourt Launch Checks` passes on the exact release commit.
- [ ] Branch is not behind `main`.
- [ ] Review `main...hardcourt-current-integration` for unexpected Gridiron changes.
- [ ] Confirm these required files exist: Hardcourt PWA shell, Stripe checkout/status functions, commercial bridge, game persistence, sharing/coach migration.

## 2. Supabase production deployment
Apply migrations in repository timestamp order. Confirm these Hardcourt launch migrations are applied:
- [ ] `20260930235500_hardcourt_commercial_bridge.sql`
- [ ] `20261001000500_hardcourt_game_persistence.sql`
- [ ] `20261001011000_hardcourt_sharing_and_coaches.sql`

Deploy/update Edge Functions:
- [ ] `create-stripe-checkout`
- [ ] `checkout-status`

Production checks:
- [ ] Auth redirect URLs include the live Bleacher Butt Stats domain and the current GitHub Pages fallback while it remains in use.
- [ ] Anonymous viewer RPC works without exposing authenticated team-management functions.
- [ ] Realtime is available for `hardcourt_events` live-view updates.

## 3. Stripe production configuration
- [ ] Hardcourt Stat Keeper price is $14.99 / team season.
- [ ] Hardcourt Team Pro price is $39.99 / team season.
- [ ] Checkout permits promotion codes.
- [ ] Create at least one private friends/family test promotion code before public launch.
- [ ] Confirm successful Hardcourt checkout returns to Hardcourt, not Gridiron.
- [ ] Confirm cancelled checkout returns without changing entitlement.

## 4. Domain / landing page
- [ ] `bleacherbuttstats.com` resolves over HTTPS.
- [ ] `www.bleacherbuttstats.com` resolves/redirects consistently.
- [ ] Landing-page Hardcourt CTA preselects Hardcourt rather than asking for the edition again.
- [ ] Seven-day free trial language is visible before account creation.
- [ ] QR code resolves to the production landing page, not a branch preview URL.

## 5. Fresh-account smoke test
Use a new email that has never used a Bleacher Butt Stats trial.
- [ ] Open Hardcourt CTA.
- [ ] Create account / sign in.
- [ ] No trial time is consumed before team onboarding is completed.
- [ ] Create team and roster.
- [ ] Tap `Start My 7-Day Trial`.
- [ ] Team Pro trial shows seven-day access.
- [ ] Refresh browser; team and roster persist.
- [ ] Sign out/in; same team returns.

## 6. Game smoke test
- [ ] Create a game.
- [ ] Record 2PT/3PT make and miss, FT, foul, turnover, steal and rebound.
- [ ] Stop/start clock and change period.
- [ ] Refresh during an open game; game can be recovered.
- [ ] Game History shows the game and event count.
- [ ] Finalize game.
- [ ] Finalized game opens read-only and cannot regain statkeeper authority.

## 7. Sharing smoke test
Parent / viewer:
- [ ] Generate viewer link.
- [ ] Open in private/incognito browser with no account.
- [ ] Viewer sees live score/stats and cannot edit.

Coach:
- [ ] Send email-locked coach invite.
- [ ] Open while signed out, then authenticate.
- [ ] Invite attaches coach to the existing team; no placeholder team/trial is created.
- [ ] Verify coach-seat limit.

Substitute statkeeper:
- [ ] Generate game-specific helper link for a valid email.
- [ ] Helper can stat only the assigned game.
- [ ] Finalizing/revoking removes helper access.

## 8. Purchase smoke test
- [ ] Complete a Stripe test purchase for Stat Keeper.
- [ ] Return page verifies payment and unlocks correct team.
- [ ] Repeat with Team Pro.
- [ ] Test a percentage-off promotion code.
- [ ] Test a 100%-off friends/family promotion code.
- [ ] Multi-team account purchase applies to the team that initiated checkout.

## 9. iPhone/iPad PWA smoke test
- [ ] Safari loads current production version.
- [ ] Add Hardcourt to Home Screen.
- [ ] Correct Hardcourt icon/name appears.
- [ ] Launches standalone into Hardcourt scope.
- [ ] Deploy a harmless version bump and confirm installed app receives fresh code without manual cache clearing.
- [ ] Offline launch reaches cached shell; reconnect restores cloud behavior.

## 10. Go / no-go
Public launch only after sections 1–9 are complete. Record the tested release commit below.

**Release commit:** ____________________

**Tested by/date:** ____________________
