create or replace function private.record_trial_started_analytics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if new.trial_started_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.trial_started_at is not distinct from new.trial_started_at then
    return new;
  end if;
  select t.owner_user_id into v_owner from public.teams t where t.id = new.team_id;
  insert into public.analytics_events(user_id,team_id,event_name,properties,created_at)
  values(
    v_owner,
    new.team_id,
    'trial_started',
    jsonb_build_object(
      'tier',new.tier,
      'trial_ends_at',new.trial_ends_at,
      'access_source',new.access_source,
      'complimentary',new.complimentary
    ),
    new.trial_started_at
  );
  return new;
end;
$$;

drop trigger if exists team_entitlements_record_trial_started on public.team_entitlements;
create trigger team_entitlements_record_trial_started
after insert or update of trial_started_at on public.team_entitlements
for each row execute function private.record_trial_started_analytics();

insert into public.analytics_events(user_id,team_id,event_name,properties,created_at)
select
  t.owner_user_id,
  te.team_id,
  'trial_started',
  jsonb_build_object(
    'tier',te.tier,
    'trial_ends_at',te.trial_ends_at,
    'access_source',te.access_source,
    'complimentary',te.complimentary,
    'backfilled',true
  ),
  te.trial_started_at
from public.team_entitlements te
join public.teams t on t.id=te.team_id
where te.trial_started_at is not null
  and not exists (
    select 1 from public.analytics_events ae
    where ae.team_id=te.team_id
      and ae.event_name='trial_started'
      and ae.created_at=te.trial_started_at
  );
