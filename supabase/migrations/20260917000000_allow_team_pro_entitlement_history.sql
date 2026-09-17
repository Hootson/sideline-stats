alter table public.entitlement_history
  drop constraint if exists entitlement_history_from_tier_check,
  drop constraint if exists entitlement_history_to_tier_check;

alter table public.entitlement_history
  add constraint entitlement_history_from_tier_check
    check (from_tier is null or from_tier in ('free','trial','statkeeper','coach','team_pro')),
  add constraint entitlement_history_to_tier_check
    check (to_tier in ('free','trial','statkeeper','coach','team_pro'));
