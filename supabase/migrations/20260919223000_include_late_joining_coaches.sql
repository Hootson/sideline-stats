begin;

create or replace function private.open_game_debrief_cycle()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_team_id uuid;
  v_cycle_id uuid;
  v_expected integer := 0;
begin
  if new.status <> 'final' or old.status='final' then return new; end if;
  select s.team_id into v_team_id from public.seasons s where s.id=new.season_id;
  insert into public.game_debrief_cycles(game_id,team_id,opened_at,deadline_at,status)
  values (new.id,v_team_id,now(),now()+interval '24 hours','open')
  on conflict (game_id) do nothing
  returning id into v_cycle_id;
  if v_cycle_id is null then return new; end if;

  insert into public.game_debrief_assignments(cycle_id,game_id,coach_user_id)
  select v_cycle_id,new.id,m.user_id
  from public.team_members m
  where m.team_id=v_team_id and m.status='active' and m.is_coach=true
  on conflict do nothing;

  select count(*) into v_expected from public.game_debrief_assignments where cycle_id=v_cycle_id;
  update public.game_debrief_cycles set expected_coach_count=v_expected,status='open',updated_at=now() where id=v_cycle_id;

  insert into public.user_notifications(user_id,team_id,game_id,notification_type,title,body,action_url,dedupe_key)
  select a.coach_user_id,v_team_id,new.id,'debrief_opened',
         'Week '||coalesce(new.week_number::text,'')||' debrief ready',
         'Submit or skip within 24 hours. The Coaching Read publishes after everyone responds or the window closes.',
         '/?debriefGame='||new.id::text,
         'debrief-open:'||new.id::text||':'||a.coach_user_id::text
  from public.game_debrief_assignments a where a.cycle_id=v_cycle_id
  on conflict (dedupe_key) do nothing;

  if v_expected>0 then perform private.queue_debrief_workflow_job(v_cycle_id,'notify_open'); end if;
  return new;
end;
$$;
revoke all on function private.open_game_debrief_cycle() from public, anon, authenticated;

create or replace function private.add_coach_to_open_debriefs()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare r public.game_debrief_cycles%rowtype; v_inserted integer;
begin
  if new.status<>'active' or new.is_coach<>true then return new; end if;
  for r in select * from public.game_debrief_cycles
    where team_id=new.team_id and status='open' and deadline_at>now()
  loop
    insert into public.game_debrief_assignments(cycle_id,game_id,coach_user_id)
    values (r.id,r.game_id,new.user_id) on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted>0 then
      update public.game_debrief_cycles set expected_coach_count=(select count(*) from public.game_debrief_assignments where cycle_id=r.id),updated_at=now() where id=r.id;
      insert into public.user_notifications(user_id,team_id,game_id,notification_type,title,body,action_url,dedupe_key)
      select new.user_id,r.team_id,r.game_id,'debrief_opened','Game debrief ready',
             'Submit or skip before the 24-hour window closes.','/?debriefGame='||r.game_id::text,
             'debrief-open:'||r.game_id::text||':'||new.user_id::text
      on conflict (dedupe_key) do nothing;
      perform private.queue_debrief_workflow_job(r.id,'notify_open');
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function private.add_coach_to_open_debriefs() from public, anon, authenticated;

drop trigger if exists add_coach_to_open_debriefs_after_membership on public.team_members;
create trigger add_coach_to_open_debriefs_after_membership
after insert or update of is_coach,status on public.team_members
for each row execute function private.add_coach_to_open_debriefs();

commit;
