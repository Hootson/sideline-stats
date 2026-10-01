-- Hardcourt production persistence + game history bridge.
-- Uses existing games / hardcourt_events tables so Gridiron and Hardcourt stay under one account model.

create or replace function public.get_hardcourt_games(p_team_id uuid)
returns table(game_id uuid,season_id uuid,opponent_name text,status text,game_type text,started_at timestamptz,created_at timestamptz,event_count bigint)
language sql stable security definer set search_path=''
as $$
 select g.id,g.season_id,g.opponent_name,g.status,g.game_type,g.started_at,g.created_at,count(e.id)
 from public.games g
 join public.seasons s on s.id=g.season_id
 left join public.hardcourt_events e on e.game_id=g.id and e.deleted_at is null
 where s.team_id=p_team_id
   and (private.can_manage_team(p_team_id) or private.has_substitute_team_access(p_team_id))
   and g.sport='basketball'
 group by g.id
 order by coalesce(g.started_at,g.created_at) desc;
$$;
revoke all on function public.get_hardcourt_games(uuid) from public,anon;
grant execute on function public.get_hardcourt_games(uuid) to authenticated;

create or replace function public.resume_hardcourt_game(p_game_id uuid)
returns table(game_id uuid,team_id uuid,season_id uuid,opponent_name text,status text,game_type text,can_statkeep boolean)
language sql stable security definer set search_path=''
as $$
 select g.id,s.team_id,g.season_id,g.opponent_name,g.status,g.game_type,private.can_statkeep_game(g.id)
 from public.games g join public.seasons s on s.id=g.season_id
 where g.id=p_game_id and g.sport='basketball'
   and (private.can_manage_team(s.team_id) or private.is_game_substitute(g.id));
$$;
revoke all on function public.resume_hardcourt_game(uuid) from public,anon;
grant execute on function public.resume_hardcourt_game(uuid) to authenticated;

create or replace function public.finalize_hardcourt_game(p_game_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_team uuid;
begin
 select s.team_id into v_team from public.games g join public.seasons s on s.id=g.season_id where g.id=p_game_id and g.sport='basketball';
 if v_team is null then raise exception 'Game not found'; end if;
 if not private.can_statkeep_game(p_game_id) then raise exception 'Not authorized to finalize this game'; end if;
 update public.games set status='final' where id=p_game_id;
 perform public.finish_game_statkeeper_assignment(p_game_id);
 return true;
end;
$$;
revoke all on function public.finalize_hardcourt_game(uuid) from public,anon;
grant execute on function public.finalize_hardcourt_game(uuid) to authenticated;
