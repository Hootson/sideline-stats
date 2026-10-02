alter table public.teams
  add column if not exists snap_minimum integer not null default 10;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teams'::regclass
      and conname = 'teams_snap_minimum_range'
  ) then
    alter table public.teams
      add constraint teams_snap_minimum_range
      check (snap_minimum between 1 and 100);
  end if;
end $$;

create or replace function public.create_snap_tracker_invite(
  p_game_id uuid,
  p_expires_hours integer default 12
)
returns table(token text, expires_at timestamptz)
language plpgsql
security definer
set search_path to 'public', 'private', 'auth', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_token text;
  v_expires timestamptz;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not private.can_manage_team(private.game_team_id(p_game_id)) then raise exception 'Not authorized'; end if;
  if not private.team_has_statkeeping_access(private.game_team_id(p_game_id)) then raise exception 'Statkeeping access required'; end if;

  select i.token, i.expires_at
    into v_token, v_expires
    from public.snap_tracker_invites i
   where i.game_id = p_game_id
     and i.created_by = v_uid
     and i.active = true
     and i.revoked_at is null
     and i.expires_at > now()
   order by i.created_at desc
   limit 1;

  if v_token is not null then
    v_expires := greatest(v_expires, now() + make_interval(hours => greatest(1, least(coalesce(p_expires_hours, 12), 72))));
    update public.snap_tracker_invites
       set expires_at = v_expires, updated_at = now()
     where snap_tracker_invites.token = v_token;
    return query select v_token, v_expires;
    return;
  end if;

  update public.snap_tracker_invites
     set active = false,
         revoked_at = coalesce(revoked_at, now()),
         updated_at = now()
   where game_id = p_game_id and active = true;

  v_expires := now() + make_interval(hours => greatest(1, least(coalesce(p_expires_hours, 12), 72)));
  insert into public.snap_tracker_invites(game_id, created_by, expires_at)
  values (p_game_id, v_uid, v_expires)
  returning snap_tracker_invites.token into v_token;

  return query select v_token, v_expires;
end
$function$;

revoke all on function public.create_snap_tracker_invite(uuid, integer) from public, anon;
grant execute on function public.create_snap_tracker_invite(uuid, integer) to authenticated;

create or replace function public.get_snap_tracker_game(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'auth', 'pg_temp'
as $function$
declare
  v_inv public.snap_tracker_invites%rowtype;
  v_game public.games%rowtype;
  v_season public.seasons%rowtype;
  v_team public.teams%rowtype;
  v_players jsonb;
  v_counts jsonb;
  v_snap_count integer;
begin
  select * into v_inv from public.snap_tracker_invites
   where token = p_token and active = true and revoked_at is null
     and (expires_at is null or expires_at > now())
   limit 1;
  if not found then raise exception 'Snap tracker link is invalid or expired'; end if;

  select * into v_game from public.games where id = v_inv.game_id;
  select * into v_season from public.seasons where id = v_game.season_id;
  select * into v_team from public.teams where id = v_season.team_id;

  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'jersey', p.jersey_number, 'name', p.name)
    order by nullif(regexp_replace(p.jersey_number, '[^0-9]', '', 'g'), '')::int nulls last, p.jersey_number), '[]'::jsonb)
    into v_players
    from public.players p where p.season_id = v_season.id and p.active = true;

  select count(*) into v_snap_count from public.snap_events se
   where se.game_id = v_game.id and se.active = true;

  select coalesce(jsonb_object_agg(x.player_id::text, x.cnt), '{}'::jsonb) into v_counts
    from (
      select sp.player_id, count(*)::int cnt
      from public.snap_participants sp
      join public.snap_events se on se.id = sp.snap_event_id
      where se.game_id = v_game.id and se.active = true
      group by sp.player_id
    ) x;

  return jsonb_build_object(
    'team', jsonb_build_object(
      'id', v_team.id,
      'name', v_team.name,
      'primary', v_team.primary_color,
      'accent', v_team.accent_color,
      'logo', v_team.logo_data,
      'snapMinimum', coalesce(v_team.snap_minimum, 10)
    ),
    'game', jsonb_build_object(
      'id', v_game.id,
      'opponent', v_game.opponent_name,
      'week', v_game.week_number,
      'quarter', v_game.current_quarter,
      'status', v_game.status,
      'teamScore', v_game.team_score,
      'opponentScore', v_game.opponent_score
    ),
    'players', v_players,
    'snapCount', v_snap_count,
    'playerSnapCounts', v_counts,
    'expiresAt', v_inv.expires_at
  );
end
$function$;

revoke all on function public.get_snap_tracker_game(text) from public;
grant execute on function public.get_snap_tracker_game(text) to anon, authenticated;
