-- Sideline Stats V4.5.12
-- Stores the reusable offensive playbook on the team. Individual plays retain
-- an immutable play-call snapshot inside plays.event_data.raw.

alter table public.teams
  add column if not exists playbook jsonb not null default '[]'::jsonb;

alter table public.teams
  drop constraint if exists teams_playbook_is_array;

alter table public.teams
  add constraint teams_playbook_is_array
  check (jsonb_typeof(playbook) = 'array');
