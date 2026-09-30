create or replace function public.get_my_game_statkeeper_assignment(p_team_id uuid default null::uuid, p_game_id uuid default null::uuid)
returns table(team_id uuid, season_id uuid, game_id uuid, member_role text, expires_at timestamp with time zone)
language plpgsql
security definer
set search_path = 'public', 'private', 'auth', 'extensions', 'pg_temp'
as $function$
begin
  -- The Gridiron startup flow already calls this RPC before choosing the
  -- account's cloud team. Claim any valid email-locked coach invitation here
  -- so an existing coach account can recover membership even when its original
  -- invite URL/token is no longer present in this browser.
  perform public.claim_my_pending_coach_invites();

  return query
  select a.team_id,a.season_id,a.game_id,'substitute_statkeeper'::text,a.expires_at
    from private.game_statkeeper_assignments a
    join public.games g on g.id=a.game_id and g.season_id=a.season_id
   where a.user_id=(select auth.uid()) and a.revoked_at is null and a.expires_at>now()
     and (p_team_id is null or a.team_id=p_team_id)
     and (p_game_id is null or a.game_id=p_game_id)
   order by a.created_at desc limit 1;
end;
$function$;

grant execute on function public.get_my_game_statkeeper_assignment(uuid,uuid) to authenticated;
