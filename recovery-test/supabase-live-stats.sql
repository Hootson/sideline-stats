-- Sideline Stats V4.5.3: publish complete game updates to read-only viewers.

create or replace function public.publish_game_update(p_game_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$
  update public.games
     set revision = revision + 1
   where id = p_game_id
  returning revision;
$$;

revoke all on function public.publish_game_update(uuid) from public;
grant execute on function public.publish_game_update(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.teams;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.play_credits;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.snap_participants;
exception when duplicate_object then null;
end $$;
