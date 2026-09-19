-- Sideline Stats V4.6.0 — one-time 24-hour coach debrief workflow.
-- Finalization opens exactly one cycle, snapshots the active coach roster,
-- and queues background work without reopening after later stat corrections.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

create table if not exists public.game_debrief_cycles (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  opened_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  status text not null default 'open' check (status in ('open','ready','generating','published')),
  expected_coach_count integer not null default 0 check (expected_coach_count >= 0),
  responded_coach_count integer not null default 0 check (responded_coach_count >= 0),
  generation_attempts integer not null default 0 check (generation_attempts >= 0),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.game_debrief_assignments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.game_debrief_cycles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','submitted','skipped')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, coach_user_id),
  unique (game_id, coach_user_id)
);

create table if not exists public.coach_reads (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references public.games(id) on delete cascade,
  cycle_id uuid not null unique references public.game_debrief_cycles(id) on delete cascade,
  source_mode text not null check (source_mode in ('data_only','data_and_debrief')),
  sections jsonb not null default '{}'::jsonb check (jsonb_typeof(sections)='object'),
  model text,
  input_snapshot_hash text,
  revision integer not null default 1 check (revision >= 1),
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  notification_type text not null check (notification_type in ('debrief_opened','coach_read_published')),
  title text not null,
  body text not null,
  action_url text not null default '/',
  dedupe_key text not null unique,
  channel_state jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.debrief_workflow_jobs (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.game_debrief_cycles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  job_kind text not null check (job_kind in ('notify_open','generate_read','notify_published')),
  token_hash text not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  attempts integer not null default 1 check (attempts >= 1),
  last_error text,
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, job_kind)
);

create index if not exists game_debrief_cycles_team_idx on public.game_debrief_cycles(team_id, opened_at desc);
create index if not exists game_debrief_cycles_deadline_idx on public.game_debrief_cycles(status, deadline_at);
create index if not exists game_debrief_assignments_coach_idx on public.game_debrief_assignments(coach_user_id, status);
create index if not exists user_notifications_user_idx on public.user_notifications(user_id, created_at desc);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id) where active;
create index if not exists debrief_workflow_jobs_status_idx on private.debrief_workflow_jobs(status, updated_at);

alter table public.game_debrief_cycles enable row level security;
alter table public.game_debrief_assignments enable row level security;
alter table public.coach_reads enable row level security;
alter table public.user_notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table private.debrief_workflow_jobs enable row level security;

revoke all on private.debrief_workflow_jobs from public, anon, authenticated;
grant select on public.game_debrief_cycles, public.game_debrief_assignments, public.coach_reads, public.user_notifications to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

drop policy if exists "Team staff can read debrief cycles" on public.game_debrief_cycles;
create policy "Team staff can read debrief cycles" on public.game_debrief_cycles for select to authenticated
using (private.is_game_coach(game_id) or private.can_manage_team(team_id));

drop policy if exists "Team staff can read debrief assignments" on public.game_debrief_assignments;
create policy "Team staff can read debrief assignments" on public.game_debrief_assignments for select to authenticated
using (private.is_game_coach(game_id) or coach_user_id=(select auth.uid()));

drop policy if exists "Team staff can read coach reads" on public.coach_reads;
create policy "Team staff can read coach reads" on public.coach_reads for select to authenticated
using (private.is_game_coach(game_id) or private.can_manage_team(private.game_team_id(game_id)));

drop policy if exists "Users read own notifications" on public.user_notifications;
create policy "Users read own notifications" on public.user_notifications for select to authenticated
using (user_id=(select auth.uid()));

drop policy if exists "Users update own notifications" on public.user_notifications;
create policy "Users update own notifications" on public.user_notifications for update to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions" on public.push_subscriptions for all to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

alter table public.coach_debriefs drop constraint if exists coach_debriefs_status_check;
alter table public.coach_debriefs add constraint coach_debriefs_status_check check (status in ('draft','submitted','skipped'));

drop policy if exists "Coach can create own debrief" on public.coach_debriefs;
create policy "Coach can create own debrief" on public.coach_debriefs for insert to authenticated
with check (
  coach_user_id=(select auth.uid()) and private.is_game_coach(game_id)
  and exists (
    select 1 from public.game_debrief_assignments a
    join public.game_debrief_cycles c on c.id=a.cycle_id
    where a.game_id=coach_debriefs.game_id and a.coach_user_id=(select auth.uid())
      and a.status='pending' and c.status='open' and now() < c.deadline_at
  )
);

drop policy if exists "Coach can update own debrief" on public.coach_debriefs;
create policy "Coach can update own debrief" on public.coach_debriefs for update to authenticated
using (coach_user_id=(select auth.uid()) and private.is_game_coach(game_id))
with check (
  coach_user_id=(select auth.uid()) and private.is_game_coach(game_id)
  and exists (
    select 1 from public.game_debrief_assignments a
    join public.game_debrief_cycles c on c.id=a.cycle_id
    where a.game_id=coach_debriefs.game_id and a.coach_user_id=(select auth.uid())
      and a.status='pending' and c.status='open' and now() < c.deadline_at
  )
);

drop policy if exists "Eligible coaches can read team debriefs" on public.coach_debriefs;
create policy "Eligible coaches can read team debriefs" on public.coach_debriefs for select to authenticated
using (private.is_game_coach(game_id) and (coach_user_id=(select auth.uid()) or status='submitted'));

create or replace function private.queue_debrief_workflow_job(p_cycle_id uuid, p_kind text)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_game_id uuid;
  v_token text;
  v_job_id uuid;
begin
  if p_kind not in ('notify_open','generate_read','notify_published') then
    raise exception 'Invalid workflow job';
  end if;
  select game_id into v_game_id from public.game_debrief_cycles where id=p_cycle_id;
  if v_game_id is null then raise exception 'Debrief cycle not found'; end if;
  v_token := replace(extensions.gen_random_uuid()::text,'-','') || replace(extensions.gen_random_uuid()::text,'-','');
  insert into private.debrief_workflow_jobs(cycle_id,game_id,job_kind,token_hash,status,attempts,updated_at)
  values (p_cycle_id,v_game_id,p_kind,encode(extensions.digest(v_token,'sha256'),'hex'),'queued',1,now())
  on conflict (cycle_id,job_kind) do update set
    token_hash=excluded.token_hash,
    status='queued',
    attempts=private.debrief_workflow_jobs.attempts+1,
    last_error=null,
    claimed_at=null,
    completed_at=null,
    updated_at=now()
  where private.debrief_workflow_jobs.status='failed'
     or (private.debrief_workflow_jobs.status='processing' and private.debrief_workflow_jobs.claimed_at < now()-interval '10 minutes')
  returning id into v_job_id;
  if v_job_id is null then return null; end if;
  perform net.http_post(
    url:='https://eyuvgzhkhcpwtcbmsvct.supabase.co/functions/v1/coach-debrief-workflow',
    headers:=jsonb_build_object('Content-Type','application/json','apikey','sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l'),
    body:=jsonb_build_object('job_token',v_token),
    timeout_milliseconds:=10000
  );
  return v_job_id;
end;
$$;
revoke all on function private.queue_debrief_workflow_job(uuid,text) from public, anon, authenticated;

create or replace function private.open_game_debrief_cycle()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_team_id uuid;
  v_cycle_id uuid;
  v_created boolean := false;
  v_expected integer := 0;
begin
  if new.status <> 'final' or old.status='final' then return new; end if;
  select s.team_id into v_team_id from public.seasons s where s.id=new.season_id;
  insert into public.game_debrief_cycles(game_id,team_id,opened_at,deadline_at,status)
  values (new.id,v_team_id,now(),now()+interval '24 hours','open')
  on conflict (game_id) do nothing
  returning id into v_cycle_id;
  v_created := v_cycle_id is not null;
  if not v_created then return new; end if;

  insert into public.game_debrief_assignments(cycle_id,game_id,coach_user_id)
  select v_cycle_id,new.id,m.user_id
  from public.team_members m
  where m.team_id=v_team_id and m.status='active' and m.is_coach=true
  on conflict do nothing;

  select count(*) into v_expected from public.game_debrief_assignments where cycle_id=v_cycle_id;
  update public.game_debrief_cycles
  set expected_coach_count=v_expected,
      status=case when v_expected=0 then 'ready' else 'open' end,
      updated_at=now()
  where id=v_cycle_id;

  insert into public.user_notifications(user_id,team_id,game_id,notification_type,title,body,action_url,dedupe_key)
  select a.coach_user_id,v_team_id,new.id,'debrief_opened',
         'Week '||coalesce(new.week_number::text,'')||' debrief ready',
         'Submit or skip within 24 hours. The Coaching Read publishes after everyone responds or the window closes.',
         '/?debriefGame='||new.id::text,
         'debrief-open:'||new.id::text||':'||a.coach_user_id::text
  from public.game_debrief_assignments a where a.cycle_id=v_cycle_id
  on conflict (dedupe_key) do nothing;

  if v_expected>0 then perform private.queue_debrief_workflow_job(v_cycle_id,'notify_open');
  else perform private.queue_debrief_workflow_job(v_cycle_id,'generate_read'); end if;
  return new;
end;
$$;
revoke all on function private.open_game_debrief_cycle() from public, anon, authenticated;

drop trigger if exists open_game_debrief_cycle_after_final on public.games;
create trigger open_game_debrief_cycle_after_final
after update of status on public.games
for each row execute function private.open_game_debrief_cycle();

create or replace function private.refresh_game_debrief_cycle()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_expected integer;
  v_responded integer;
  v_status text;
begin
  select count(*),count(*) filter (where status in ('submitted','skipped'))
  into v_expected,v_responded
  from public.game_debrief_assignments where cycle_id=new.cycle_id;
  select status into v_status from public.game_debrief_cycles where id=new.cycle_id for update;
  update public.game_debrief_cycles
  set expected_coach_count=v_expected,responded_coach_count=v_responded,
      status=case when status='open' and v_responded>=v_expected then 'ready' else status end,
      updated_at=now()
  where id=new.cycle_id;
  if v_status='open' and v_responded>=v_expected then
    perform private.queue_debrief_workflow_job(new.cycle_id,'generate_read');
  end if;
  return new;
end;
$$;
revoke all on function private.refresh_game_debrief_cycle() from public, anon, authenticated;

drop trigger if exists refresh_game_debrief_cycle_after_response on public.game_debrief_assignments;
create trigger refresh_game_debrief_cycle_after_response
after update of status on public.game_debrief_assignments
for each row when (old.status is distinct from new.status)
execute function private.refresh_game_debrief_cycle();

create or replace function public.save_coach_debrief(
  p_game_id uuid,
  p_status text,
  p_input_method text default 'text',
  p_transcript_text text default '',
  p_structured_context jsonb default '{}'::jsonb,
  p_energy_rating integer default null,
  p_execution_rating integer default null
)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_assignment public.game_debrief_assignments%rowtype;
  v_cycle public.game_debrief_cycles%rowtype;
  v_revision integer;
begin
  if v_uid is null then raise exception 'Sign in to save a debrief'; end if;
  if p_status not in ('draft','submitted','skipped') then raise exception 'Invalid debrief status'; end if;
  if p_input_method not in ('voice','text') then raise exception 'Invalid input method'; end if;
  if not private.is_game_coach(p_game_id) then raise exception 'Coach access is required'; end if;
  select * into v_assignment from public.game_debrief_assignments
    where game_id=p_game_id and coach_user_id=v_uid for update;
  if not found then raise exception 'You were not assigned to this game debrief'; end if;
  select * into v_cycle from public.game_debrief_cycles where id=v_assignment.cycle_id for update;
  if v_cycle.status<>'open' or now()>=v_cycle.deadline_at then raise exception 'This 24-hour debrief window has closed'; end if;
  if v_assignment.status<>'pending' then raise exception 'Your response has already been recorded'; end if;

  select coalesce(max(revision),0)+1 into v_revision from public.coach_debriefs
    where game_id=p_game_id and coach_user_id=v_uid;
  insert into public.coach_debriefs(game_id,coach_user_id,input_method,transcript_text,structured_context,energy_rating,execution_rating,status,revision,submitted_at,updated_at)
  values (p_game_id,v_uid,p_input_method,left(coalesce(p_transcript_text,''),12000),coalesce(p_structured_context,'{}'::jsonb),p_energy_rating,p_execution_rating,p_status,v_revision,case when p_status in ('submitted','skipped') then now() end,now())
  on conflict (game_id,coach_user_id) do update set
    input_method=excluded.input_method,transcript_text=excluded.transcript_text,structured_context=excluded.structured_context,
    energy_rating=excluded.energy_rating,execution_rating=excluded.execution_rating,status=excluded.status,
    revision=public.coach_debriefs.revision+1,submitted_at=excluded.submitted_at,updated_at=now();

  if p_status in ('submitted','skipped') then
    update public.game_debrief_assignments set status=p_status,responded_at=now(),updated_at=now()
    where id=v_assignment.id;
  end if;
  return p_status;
end;
$$;
revoke all on function public.save_coach_debrief(uuid,text,text,text,jsonb,integer,integer) from public, anon;
grant execute on function public.save_coach_debrief(uuid,text,text,text,jsonb,integer,integer) to authenticated;

create or replace function public.claim_debrief_workflow_job(p_token text)
returns table(job_id uuid, cycle_id uuid, game_id uuid, job_kind text)
language plpgsql
security definer
set search_path=''
as $$
declare v_job private.debrief_workflow_jobs%rowtype;
begin
  if p_token is null or length(p_token)<64 then return; end if;
  select * into v_job from private.debrief_workflow_jobs j
  where j.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and j.status='queued'
  for update skip locked;
  if not found then return; end if;
  update private.debrief_workflow_jobs set status='processing',claimed_at=now(),updated_at=now() where id=v_job.id;
  return query select v_job.id,v_job.cycle_id,v_job.game_id,v_job.job_kind;
end;
$$;
revoke all on function public.claim_debrief_workflow_job(text) from public;
grant execute on function public.claim_debrief_workflow_job(text) to service_role;

create or replace function public.finish_debrief_workflow_job(p_token text,p_success boolean,p_error text default null)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare v_job private.debrief_workflow_jobs%rowtype;
begin
  select * into v_job from private.debrief_workflow_jobs j
  where j.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and j.status='processing'
  for update;
  if not found then return false; end if;
  update private.debrief_workflow_jobs set status=case when p_success then 'completed' else 'failed' end,
    last_error=case when p_success then null else left(coalesce(p_error,'Workflow failed'),500) end,
    completed_at=case when p_success then now() else null end,updated_at=now()
  where id=v_job.id;
  if not p_success and v_job.job_kind='generate_read' then
    update public.game_debrief_cycles set status='ready',updated_at=now() where id=v_job.cycle_id and status='generating';
  end if;
  return true;
end;
$$;
revoke all on function public.finish_debrief_workflow_job(text,boolean,text) from public;
grant execute on function public.finish_debrief_workflow_job(text,boolean,text) to service_role;

create or replace function public.publish_generated_coach_read(
  p_token text,p_sections jsonb,p_source_mode text,p_model text,p_snapshot_hash text
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare v_job private.debrief_workflow_jobs%rowtype; v_team_id uuid; v_revision integer;
begin
  if p_source_mode not in ('data_only','data_and_debrief') or jsonb_typeof(p_sections)<>'object' then return false; end if;
  select * into v_job from private.debrief_workflow_jobs j
  where j.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex')
    and j.status='processing' and j.job_kind='generate_read' for update;
  if not found then return false; end if;
  select team_id into v_team_id from public.game_debrief_cycles where id=v_job.cycle_id;
  select coalesce(max(revision),0)+1 into v_revision from public.coach_reads where game_id=v_job.game_id;
  insert into public.coach_reads(game_id,cycle_id,source_mode,sections,model,input_snapshot_hash,revision,generated_at,updated_at)
  values (v_job.game_id,v_job.cycle_id,p_source_mode,p_sections,p_model,p_snapshot_hash,v_revision,now(),now())
  on conflict (game_id) do update set source_mode=excluded.source_mode,sections=excluded.sections,
    model=excluded.model,input_snapshot_hash=excluded.input_snapshot_hash,
    revision=public.coach_reads.revision+1,generated_at=now(),updated_at=now();
  update public.game_debrief_cycles set status='published',published_at=now(),updated_at=now() where id=v_job.cycle_id;
  update private.debrief_workflow_jobs set status='completed',completed_at=now(),updated_at=now() where id=v_job.id;
  insert into public.user_notifications(user_id,team_id,game_id,notification_type,title,body,action_url,dedupe_key)
  select m.user_id,v_team_id,v_job.game_id,'coach_read_published','Coaching Read refreshed',
         'The game analytics now combine the recorded data with every submitted coach debrief.',
         '/?coachReadGame='||v_job.game_id::text,
         'coach-read:'||v_job.game_id::text||':'||m.user_id::text
  from public.team_members m
  where m.team_id=v_team_id and m.status='active' and (m.is_coach or m.is_admin or m.is_statkeeper)
  on conflict (dedupe_key) do nothing;
  perform private.queue_debrief_workflow_job(v_job.cycle_id,'notify_published');
  return true;
end;
$$;
revoke all on function public.publish_generated_coach_read(text,jsonb,text,text,text) from public;
grant execute on function public.publish_generated_coach_read(text,jsonb,text,text,text) to service_role;

create or replace function private.process_due_debrief_cycles()
returns void
language plpgsql
security definer
set search_path=''
as $$
declare r record;
begin
  update public.game_debrief_cycles set status='ready',updated_at=now()
  where status='open' and deadline_at<=now();
  for r in select id,status from public.game_debrief_cycles where status in ('open','ready','published') loop
    if r.status='open' then perform private.queue_debrief_workflow_job(r.id,'notify_open');
    elsif r.status='ready' then
      update public.game_debrief_cycles set status='generating',generation_attempts=generation_attempts+1,updated_at=now() where id=r.id and status='ready';
      perform private.queue_debrief_workflow_job(r.id,'generate_read');
    elsif r.status='published' then perform private.queue_debrief_workflow_job(r.id,'notify_published');
    end if;
  end loop;
end;
$$;
revoke all on function private.process_due_debrief_cycles() from public, anon, authenticated;

select cron.schedule(
  'sideline-stats-process-coach-debriefs',
  '*/2 * * * *',
  'select private.process_due_debrief_cycles()'
);
