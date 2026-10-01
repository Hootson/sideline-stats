# Hardcourt Edition — Production Launch Checklist

This checklist is intentionally short and operational. Code is not considered launched until the deployed customer path is verified.

## 1. Pre-merge gate
- [x] `Hardcourt Launch Checks` passes on the exact release commit `b2d201c5bdd120f85b67c55fac3b0bda40c7a86f`.
- [x] Integration branch was verified ahead of and not behind the protected production base during launch audit.
- [x] Release diff reviewed for unexpected Gridiron changes.
- [x] Required Hardcourt PWA shell, Stripe checkout/status functions, commercial bridge, game persistence, and sharing/coach migration are present.
- [x] PR #10 is Ready for Review and GitHub reports it mergeable.
- [ ] Merge PR #10 after the production smoke test. (Automated merge action was blocked by the tool safety layer; do not bypass it.)

## 2. Supabase production deployment
Applied to project `eyuvgzhkhcpwtcbmsvct`:
- [x] `hardcourt_commercial_bridge`
- [x] `hardcourt_game_persistence`
- [x] `hardcourt_sharing_and_coaches`

Production Edge Functions:
- [x] `create-stripe-checkout` deployed with Hardcourt + production-origin routing and promotion-code support.
- [x] `checkout-status` deployed with Bleacher Butt Stats production-domain support.
- [x] Existing `stripe-webhook` verified active for payment-to-entitlement processing.

Still verify interactively:
- [ ] Auth redirect URLs accept the live Bleacher Butt Stats domain and GitHub Pages fallback while it remains in use.
- [ ] Anonymous viewer RPC works without exposing authenticated team-management functions.
- [ ] Realtime delivers `hardcourt_events` live-view updates.

## 3. Stripe production configuration
Application configuration expects:
- [x] Hardcourt Stat Keeper — $14.99 / team season.
- [x] Hardcourt Team Pro — $39.99 / team season.
- [x] Checkout permits Stripe promotion codes.
- [x] Checkout code preserves the initiating approved origin and edition on success/cancel return.

Still verify in Stripe/customer flow:
- [ ] Confirm the configured Stripe Price IDs correspond to the intended $14.99 and $39.99 prices.
- [ ] Create/test a private friends/family percentage-off promotion code.
- [ ] Create/test a private 100%-off friends/family promotion code.
- [ ] Confirm successful checkout activates the correct team entitlement.
- [ ] Confirm cancelled checkout does not change entitlement.

## 4. Domain / landing page
Built and regression-protected:
- [x] Shared account handoff preserves selected edition.
- [x] Hardcourt handoff targets `/hardcourt/` on the production origin.
- [x] GitHub Pages fallback uses `/sideline-stats/hardcourt/`.
- [x] Seven-day trial starts after team onboarding, not merely by visiting/signing in.

Still verify live:
- [ ] `bleacherbuttstats.com` resolves over HTTPS.
- [ ] `www.bleacherbuttstats.com` resolves/redirects consistently.
- [ ] Landing-page Hardcourt CTA preselects Hardcourt rather than asking for the edition again.
- [ ] QR code resolves to the production landing page, not a branch preview URL.

## 5. Fresh-account smoke test
Use a new email that has never used a Bleacher Butt Stats trial.
- [ ] Open Hardcourt CTA.
- [ ] Create account / sign in.
- [ ] Confirm no trial time is consumed before team onboarding is completed.
- [ ] Create team and roster.
- [ ] Tap `Start My 7-Day Trial`.
- [ ] Confirm Team Pro trial shows seven-day access.
- [ ] Refresh browser; team and roster persist.
- [ ] Sign out/in; same team returns.

## 6. Game smoke test
- [ ] Create a game.
- [ ] Record 2PT/3PT make and miss, FT, foul, turnover, steal and rebound.
- [ ] Stop/start clock and change period.
- [ ] Refresh during an open game; recover the same game.
- [ ] Confirm Game History shows the game and event count.
- [ ] Finalize game.
- [ ] Confirm finalized game opens read-only and cannot regain statkeeper authority.

## 7. Sharing smoke test
Parent / viewer:
- [ ] Generate viewer link.
- [ ] Open in private/incognito browser with no account.
- [ ] Viewer sees live score/stats and cannot edit.

Coach:
- [ ] Send email-locked coach invite.
- [ ] Open while signed out, then authenticate.
- [ ] Invite attaches coach to existing team; no placeholder team/trial is created.
- [ ] Verify five-coach seat limit.

Substitute statkeeper:
- [ ] Generate game-specific helper link for a valid email.
- [ ] Helper can stat only the assigned game.
- [ ] Finalizing/revoking removes helper access.

## 8. Purchase smoke test
- [ ] Complete a Stripe test purchase for Stat Keeper.
- [ ] Return page verifies payment and unlocks the correct team.
- [ ] Repeat with Team Pro.
- [ ] Test percentage-off promotion code.
- [ ] Test 100%-off friends/family promotion code.
- [ ] Multi-team purchase applies to the team that initiated checkout.

## 9. iPhone/iPad PWA smoke test
- [ ] Safari loads current production version.
- [ ] Add Hardcourt to Home Screen.
- [ ] Correct Hardcourt icon/name appears.
- [ ] Launches standalone into Hardcourt scope.
- [ ] Deploy a harmless version bump and confirm installed app receives fresh code without manual cache clearing.
- [ ] Offline launch reaches cached shell; reconnect restores cloud behavior.

## 10. Go / no-go
Public launch only after the live smoke-test items above pass. Do not mark a browser/device/payment item complete from code inspection alone.

**Release candidate:** `b2d201c5bdd120f85b67c55fac3b0bda40c7a86f`

**Production backend deployment:** completed 2026-09-30 / 2026-10-01 session

**Frontend merge:** pending PR #10

**Real-device smoke test:** pending
