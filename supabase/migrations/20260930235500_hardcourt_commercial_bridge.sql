-- Hardcourt commercial bridge: expose the existing team entitlement model to the Hardcourt runtime
-- without creating a second billing system.
create or replace function public.get_hardcourt_commercial_access(p_team_id uuid)
returns table(
  team_id uuid,
  tier text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  trial_used boolean,
  paid_access_starts_at timestamptz,
  paid_access_ends_at timestamptz,
  access_source text,
  complimentary boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select te.team_id,te.tier::text,te.trial_started_at,te.trial_ends_at,coalesce(te.trial_used,false),te.paid_access_starts_at,te.paid_access_ends_at,te.access_source::text,coalesce(te.complimentary,false)
  from public.team_entitlements te
  where te.team_id=p_team_id
    and exists(
      select 1 from public.teams t
      left join public.team_members tm on tm.team_id=t.id and tm.user_id=auth.uid() and tm.status='active'
      where t.id=p_team_id and (t.owner_user_id=auth.uid() or tm.user_id is not null)
    );
$$;
revoke all on function public.get_hardcourt_commercial_access(uuid) from public;
grant execute on function public.get_hardcourt_commercial_access(uuid) to authenticated;

create or replace function public.start_hardcourt_team_trial(p_team_id uuid)
returns table(trial_started_at timestamptz,trial_ends_at timestamptz)
language plpgsql
security definer
set search_path=''
as $$
declare v_now timestamptz=now();
begin
  if not exists(select 1 from public.teams t where t.id=p_team_id and t.owner_user_id=auth.uid()) then raise exception 'Only the team owner can start this trial'; end if;
  insert into public.team_entitlements(team_id,tier,trial_started_at,trial_ends_at,trial_used,access_source,complimentary)
  values(p_team_id,'trial',v_now,v_now+interval '7 days',true,'standard',false)
  on conflict(team_id) do update set tier='trial',trial_started_at=v_now,trial_ends_at=v_now+interval '7 days',trial_used=true
  where public.team_entitlements.trial_used is not true and public.team_entitlements.paid_access_ends_at is null;
  if not found then raise exception 'This team has already used its trial or already has paid access'; end if;
  return query select te.trial_started_at,te.trial_ends_at from public.team_entitlements te where te.team_id=p_team_id;
end;
$$;
revoke all on function public.start_hardcourt_team_trial(uuid) from public;
grant execute on function public.start_hardcourt_team_trial(uuid) to authenticated;
