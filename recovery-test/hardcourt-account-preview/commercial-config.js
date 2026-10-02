// Bleacher Butt Stats — Hardcourt commercial configuration
// Keep the launch/prototype switch centralized so enabling paid access later
// does not require rewriting account, team, or roster flows.
export const HARDCOURT_COMMERCIAL = Object.freeze({
  paidAccessEnabled: false,
  defaultPlan: "statkeeper",
  plans: Object.freeze({
    statkeeper: Object.freeze({ priceCents: 1499, label: "Stat Keeper" }),
    team_pro: Object.freeze({ priceCents: 3999, label: "Team Pro", coachSeats: 5 })
  })
});

export function hardcourtAccessLabel(){
  return HARDCOURT_COMMERCIAL.paidAccessEnabled ? "Stat Keeper" : "Stat Keeper · Free During Preview";
}

export function hardcourtRequiresCheckout(){
  return HARDCOURT_COMMERCIAL.paidAccessEnabled;
}
