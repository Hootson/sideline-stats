grant insert on table public.viewer_events to anon, authenticated;
grant usage, select on sequence public.viewer_events_id_seq to anon, authenticated;

create or replace function public.viewer_event_game_matches_team(p_game_id uuid, p_team_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.games g
    join public.seasons s on s.id = g.season_id
    where g.id = p_game_id
      and s.team_id = p_team_id
  );
$$;

revoke all on function public.viewer_event_game_matches_team(uuid, uuid) from public;
grant execute on function public.viewer_event_game_matches_team(uuid, uuid) to anon, authenticated;

drop policy if exists viewer_events_anon_insert on public.viewer_events;
create policy viewer_events_anon_insert
on public.viewer_events
for insert
to anon, authenticated
with check (
  session_id <> ''
  and event_type = any (array['open'::text,'game_view'::text,'refresh'::text])
  and (game_id is null or public.viewer_event_game_matches_team(game_id, team_id))
);
