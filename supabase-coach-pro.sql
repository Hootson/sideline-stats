-- Sideline Stats V4.5.15 — Coach Pro and same-name team identifiers

alter table public.teams
  add column if not exists team_identifier text;

comment on column public.teams.team_identifier is
  'Optional human-readable discriminator such as Orange, Black, or Team 2. The UUID remains the canonical team identity.';

create or replace function private.is_team_coach(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teams t
    where t.id=target_team_id and t.owner_user_id=auth.uid()
  ) or exists (
    select 1 from public.team_members tm
    where tm.team_id=target_team_id and tm.user_id=auth.uid()
      and tm.status='active' and (tm.is_coach=true or tm.is_admin=true)
  );
$$;

drop policy if exists "Coach can read own debrief" on public.coach_debriefs;
drop policy if exists "Eligible coaches can read team debriefs" on public.coach_debriefs;
create policy "Eligible coaches can read team debriefs"
on public.coach_debriefs
for select
to authenticated
using (
  private.is_game_coach(game_id)
  and (coach_user_id = (select auth.uid()) or status = 'submitted')
);

-- Private restore points make the fictitious Erie demo play calls removable
-- without changing any original stats, plays, or playbook data.
create table if not exists private.coach_pro_demo_team_backup (
  team_id uuid primary key references public.teams(id) on delete cascade,
  playbook jsonb not null,
  captured_at timestamptz not null default now()
);

create table if not exists private.coach_pro_demo_play_backup (
  play_id uuid primary key references public.plays(id) on delete cascade,
  event_data jsonb not null,
  captured_at timestamptz not null default now()
);

-- Demo analysis stays in separate tables so real team and play records are untouched.
create table if not exists public.coach_demo_playbook (
  team_id uuid not null references public.teams(id) on delete cascade,
  call_number integer not null check (call_number between 1 and 999),
  call_name text not null check (char_length(call_name) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (team_id, call_number)
);

create table if not exists public.coach_demo_play_calls (
  play_id uuid primary key references public.plays(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  play_call jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.coach_demo_playbook enable row level security;
alter table public.coach_demo_play_calls enable row level security;

drop policy if exists "Eligible coaches can read demo playbook" on public.coach_demo_playbook;
create policy "Eligible coaches can read demo playbook" on public.coach_demo_playbook for select
using (private.is_team_coach(team_id) and private.team_has_coach_access(team_id));

drop policy if exists "Eligible coaches can read demo play calls" on public.coach_demo_play_calls;
create policy "Eligible coaches can read demo play calls" on public.coach_demo_play_calls for select
using (exists (select 1 from public.plays p where p.id=play_id and private.is_game_coach(p.game_id)));

create index if not exists coach_demo_play_calls_team_idx on public.coach_demo_play_calls(team_id);
