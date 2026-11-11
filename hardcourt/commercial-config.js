// Bleacher Butt Stats — Hardcourt commercial configuration
// Hardcourt shares the same team-level entitlement model as Gridiron.
export const HARDCOURT_COMMERCIAL = Object.freeze({
  trialDays: 7,
  defaultPlan: "team_pro",
  plans: Object.freeze({
    statkeeper: Object.freeze({ priceCents: 1499, label: "Stat Keeper" }),
    team_pro: Object.freeze({ priceCents: 3999, label: "Team Pro", coachSeats: 5 })
  })
});

export function hardcourtTrialLabel(){
  return `${HARDCOURT_COMMERCIAL.trialDays}-Day Team Pro Trial`;
}

export function hardcourtPlanLabel(plan){
  return HARDCOURT_COMMERCIAL.plans[plan]?.label || HARDCOURT_COMMERCIAL.plans[HARDCOURT_COMMERCIAL.defaultPlan].label;
}

export function hardcourtPriceLabel(plan){
  const cents=HARDCOURT_COMMERCIAL.plans[plan]?.priceCents;
  return Number.isFinite(cents) ? `$${(cents/100).toFixed(2)}` : '';
}
