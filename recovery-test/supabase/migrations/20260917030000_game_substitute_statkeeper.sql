-- Account-required, email-locked, game-scoped substitute statkeeper access.

create table if not exists private.game_statkeeper_invites (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  token_hash text not null unique,
  intended_email text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists private.game_statkeeper_assignments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  invite_id uuid references private.game_statkeeper_invites(id) on delete set null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(game_id,user_id)
);

create index if not exists game_statkeeper_invites_game_idx on private.game_statkeeper_invites(game_id,created_at desc);
create index if not exists game_statkeeper_assignments_user_idx on private.game_statkeeper_assignments(user_id,expires_at desc);
create index if not exists game_statkeeper_assignments_game_idx on private.game_statkeeper_assignments(game_id,expires_at desc);
revoke all on private.game_statkeeper_invites from public,anon,authenticated;
revoke all on private.game_statkeeper_assignments from public,anon,authenticated;

create or replace function private.is_game_substitute(target_game_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select (select auth.uid()) is not null and exists(
    select 1
      from private.game_statkeeper_assignments a
      join public.games g on g.id=a.game_id and g.season_id=a.season_id
      join public.seasons s on s.id=a.season_id and s.team_id=a.team_id
     where a.game_id=target_game_id
       and a.user_id=(select auth.uid())
       and a.revoked_at is null
       and a.expires_at>now()
  );
$$;

create or replace function private.has_substitute_team_access(target_team_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select (select auth.uid()) is not null and exists(
    select 1 from private.game_statkeeper_assignments a
     where a.team_id=target_team_id and a.user_id=(select auth.uid())
       and a.revoked_at is null and a.expires_at>now()
  );
$$;

create or replace function private.has_substitute_season_access(target_season_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select (select auth.uid()) is not null and exists(
    select 1 from private.game_statkeeper_assignments a
     where a.season_id=target_season_id and a.user_id=(select auth.uid())
       and a.revoked_at is null and a.expires_at>now()
  );
$$;

create or replace function private.can_statkeep_game(target_game_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select private.can_manage_team(private.game_team_id(target_game_id))
      or private.is_game_substitute(target_game_id);
$$;

create or replace function private.player_belongs_to_game(target_player_id uuid,target_game_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.players p
    join public.games g on g.season_id=p.season_id
    where p.id=target_player_id and g.id=target_game_id
  );
$$;

revoke all on function private.is_game_substitute(uuid) from public,anon;
revoke all on function private.has_substitute_team_access(uuid) from public,anon;
revoke all on function private.has_substitute_season_access(uuid) from public,anon;
revoke all on function private.can_statkeep_game(uuid) from public,anon;
revoke all on function private.player_belongs_to_game(uuid,uuid) from public,anon;
grant execute on function private.is_game_substitute(uuid) to authenticated;
grant execute on function private.has_substitute_team_access(uuid) to authenticated;
grant execute on function private.has_substitute_season_access(uuid) to authenticated;
grant execute on function private.can_statkeep_game(uuid) to authenticated;
grant execute on function private.player_belongs_to_game(uuid,uuid) to authenticated;

create or replace function public.create_game_statkeeper_invite(p_game_id uuid,p_email text,p_expires_days integer default 7)
returns table(token text,expires_at timestamptz)
language plpgsql security definer
set search_path='public','private','auth','extensions','pg_temp'
as $$
declare
  v_uid uuid:=(select auth.uid());
  v_email text:=lower(btrim(coalesce(p_email,'')));
  v_token text;
  v_expires timestamptz;
  v_team_id uuid;
  v_season_id uuid;
  v_status text;
begin
  if v_uid is null then raise exception 'Sign in to invite a substitute statkeeper'; end if;
  if v_email='' or position('@' in v_email)<2 then raise exception 'Enter a valid substitute email address'; end if;
  if p_expires_days not between 1 and 14 then raise exception 'Invitation must expire within 1 to 14 days'; end if;
  select s.team_id,g.season_id,g.status into v_team_id,v_season_id,v_status
    from public.games g join public.seasons s on s.id=g.season_id where g.id=p_game_id;
  if v_team_id is null then raise exception 'Game not found'; end if;
  if not private.can_manage_team(v_team_id) then raise exception 'Only a team statkeeper can invite a substitute'; end if;
  if not private.team_has_statkeeping_access(v_team_id) then raise exception 'An active team plan is required'; end if;
  if v_status in ('final','archived') then raise exception 'A substitute cannot be invited to a finalized game'; end if;

  update private.game_statkeeper_invites set revoked_at=coalesce(revoked_at,now())
   where game_id=p_game_id and revoked_at is null;
  update private.game_statkeeper_assignments set revoked_at=coalesce(revoked_at,now())
   where game_id=p_game_id and revoked_at is null;

  v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  v_expires:=now()+make_interval(days=>p_expires_days);
  insert into private.game_statkeeper_invites(game_id,team_id,season_id,token_hash,intended_email,created_by,expires_at)
  values(p_game_id,v_team_id,v_season_id,encode(digest(v_token,'sha256'),'hex'),v_email,v_uid,v_expires);
  return query select v_token,v_expires;
end;
$$;

create or replace function public.redeem_game_statkeeper_invite(p_token text)
returns table(team_id uuid,season_id uuid,game_id uuid,member_role text,team_name text,opponent_name text,expires_at timestamptz)
language plpgsql security definer
set search_path='public','private','auth','extensions','pg_temp'
as $$
declare
  v_uid uuid:=(select auth.uid());
  v_email text;
  v_inv private.game_statkeeper_invites%rowtype;
begin
  if v_uid is null then raise exception 'Sign in or create an account to keep stats for this game'; end if;
  if p_token is null or length(p_token)<32 then raise exception 'Substitute statkeeper invitation is invalid'; end if;
  select lower(u.email) into v_email from auth.users u where u.id=v_uid;
  select * into v_inv from private.game_statkeeper_invites i
   where i.token_hash=encode(digest(p_token,'sha256'),'hex') for update;
  if not found or v_inv.revoked_at is not null then raise exception 'Substitute statkeeper invitation is invalid'; end if;
  if v_inv.expires_at<=now() then raise exception 'Substitute statkeeper invitation has expired'; end if;
  if v_email is distinct from v_inv.intended_email then raise exception 'This substitute invitation was sent to a different email address'; end if;
  if v_inv.redeemed_by is not null and v_inv.redeemed_by<>v_uid then raise exception 'This substitute invitation has already been used'; end if;
  if not private.team_has_statkeeping_access(v_inv.team_id) then raise exception 'This team no longer has active statkeeping access'; end if;
  if exists(select 1 from public.games g where g.id=v_inv.game_id and g.status in ('final','archived')) then raise exception 'This game has already been finalized'; end if;

  update private.game_statkeeper_assignments set revoked_at=coalesce(revoked_at,now())
   where game_id=v_inv.game_id and user_id<>v_uid and revoked_at is null;
  insert into private.game_statkeeper_assignments(game_id,team_id,season_id,user_id,invited_by,invite_id,expires_at)
  values(v_inv.game_id,v_inv.team_id,v_inv.season_id,v_uid,v_inv.created_by,v_inv.id,v_inv.expires_at)
  on conflict(game_id,user_id) do update set team_id=excluded.team_id,season_id=excluded.season_id,invited_by=excluded.invited_by,invite_id=excluded.invite_id,expires_at=excluded.expires_at,revoked_at=null;
  update private.game_statkeeper_invites set redeemed_by=v_uid,redeemed_at=coalesce(redeemed_at,now()) where id=v_inv.id;

  return query select v_inv.team_id,v_inv.season_id,g.id,'substitute_statkeeper'::text,t.name,g.opponent_name,v_inv.expires_at
    from public.games g join public.teams t on t.id=v_inv.team_id where g.id=v_inv.game_id;
end;
$$;

create or replace function public.get_my_game_statkeeper_assignment(p_team_id uuid default null,p_game_id uuid default null)
returns table(team_id uuid,season_id uuid,game_id uuid,member_role text,expires_at timestamptz)
language sql stable security definer set search_path=''
as $$
  select a.team_id,a.season_id,a.game_id,'substitute_statkeeper'::text,a.expires_at
    from private.game_statkeeper_assignments a
    join public.games g on g.id=a.game_id and g.season_id=a.season_id
   where a.user_id=(select auth.uid()) and a.revoked_at is null and a.expires_at>now()
     and (p_team_id is null or a.team_id=p_team_id)
     and (p_game_id is null or a.game_id=p_game_id)
   order by a.created_at desc limit 1;
$$;

create or replace function public.get_game_statkeeper_status(p_game_id uuid)
returns table(intended_email text,redeemed_email text,claimed boolean,expires_at timestamptz,active boolean)
language plpgsql stable security definer
set search_path='public','private','auth','pg_temp'
as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if not private.can_manage_team(private.game_team_id(p_game_id)) then raise exception 'Not authorized'; end if;
  return query
  select i.intended_email,lower(u.email),(i.redeemed_by is not null),i.expires_at,
         (i.revoked_at is null and i.expires_at>now() and (i.redeemed_by is null or a.revoked_at is null))
    from private.game_statkeeper_invites i
    left join auth.users u on u.id=i.redeemed_by
    left join private.game_statkeeper_assignments a on a.invite_id=i.id and a.user_id=i.redeemed_by
   where i.game_id=p_game_id order by i.created_at desc limit 1;
end;
$$;

create or replace function public.revoke_game_statkeeper(p_game_id uuid)
returns boolean language plpgsql security definer
set search_path='public','private','auth','pg_temp'
as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if not private.can_manage_team(private.game_team_id(p_game_id)) then raise exception 'Not authorized'; end if;
  update private.game_statkeeper_invites set revoked_at=coalesce(revoked_at,now()) where game_id=p_game_id and revoked_at is null;
  update private.game_statkeeper_assignments set revoked_at=coalesce(revoked_at,now()) where game_id=p_game_id and revoked_at is null;
  return true;
end;
$$;

create or replace function public.finish_game_statkeeper_assignment(p_game_id uuid)
returns boolean language plpgsql security definer
set search_path='public','private','auth','pg_temp'
as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if not private.is_game_substitute(p_game_id) then raise exception 'Not authorized'; end if;
  if not exists(select 1 from public.games where id=p_game_id and status in ('final','archived')) then
    raise exception 'The game must be finalized first';
  end if;
  update private.game_statkeeper_invites set revoked_at=coalesce(revoked_at,now()) where game_id=p_game_id and revoked_at is null;
  update private.game_statkeeper_assignments set revoked_at=coalesce(revoked_at,now()) where game_id=p_game_id and user_id=(select auth.uid()) and revoked_at is null;
  return true;
end;
$$;

revoke all on function public.create_game_statkeeper_invite(uuid,text,integer) from public,anon;
revoke all on function public.redeem_game_statkeeper_invite(text) from public,anon;
revoke all on function public.get_my_game_statkeeper_assignment(uuid,uuid) from public,anon;
revoke all on function public.get_game_statkeeper_status(uuid) from public,anon;
revoke all on function public.revoke_game_statkeeper(uuid) from public,anon;
revoke all on function public.finish_game_statkeeper_assignment(uuid) from public,anon;
grant execute on function public.create_game_statkeeper_invite(uuid,text,integer) to authenticated;
grant execute on function public.redeem_game_statkeeper_invite(text) to authenticated;
grant execute on function public.get_my_game_statkeeper_assignment(uuid,uuid) to authenticated;
grant execute on function public.get_game_statkeeper_status(uuid) to authenticated;
grant execute on function public.revoke_game_statkeeper(uuid) to authenticated;
grant execute on function public.finish_game_statkeeper_assignment(uuid) to authenticated;

create policy "Game substitutes can read assigned team" on public.teams for select to authenticated
using(private.has_substitute_team_access(id));
create policy "Game substitutes can read assigned season" on public.seasons for select to authenticated
using(private.has_substitute_season_access(id));
create policy "Game substitutes can read assigned roster" on public.players for select to authenticated
using(private.has_substitute_season_access(season_id));
create policy "Game substitutes can read assigned game" on public.games for select to authenticated
using(private.is_game_substitute(id));
create policy "Game substitutes can update assigned game" on public.games for update to authenticated
using(private.is_game_substitute(id) and private.team_has_statkeeping_access(private.game_team_id(id)))
with check(private.is_game_substitute(id) and private.team_has_statkeeping_access(private.game_team_id(id)));

create policy "Game substitutes can read assigned plays" on public.plays for select to authenticated
using(private.is_game_substitute(game_id));
create policy "Game substitutes can create assigned plays" on public.plays for insert to authenticated
with check(created_by=(select auth.uid()) and private.is_game_substitute(game_id) and private.team_has_statkeeping_access(private.game_team_id(game_id)));
create policy "Game substitutes can update assigned plays" on public.plays for update to authenticated
using(private.is_game_substitute(game_id) and private.team_has_statkeeping_access(private.game_team_id(game_id)))
with check(private.is_game_substitute(game_id) and private.team_has_statkeeping_access(private.game_team_id(game_id)));

create policy "Game substitutes can read assigned play credits" on public.play_credits for select to authenticated
using(exists(select 1 from public.plays p where p.id=play_id and private.is_game_substitute(p.game_id)));
create policy "Game substitutes can create assigned play credits" on public.play_credits for insert to authenticated
with check(exists(select 1 from public.plays p where p.id=play_id and private.is_game_substitute(p.game_id) and (player_id is null or private.player_belongs_to_game(player_id,p.game_id))));
create policy "Game substitutes can update assigned play credits" on public.play_credits for update to authenticated
using(exists(select 1 from public.plays p where p.id=play_id and private.is_game_substitute(p.game_id)))
with check(exists(select 1 from public.plays p where p.id=play_id and private.is_game_substitute(p.game_id) and (player_id is null or private.player_belongs_to_game(player_id,p.game_id))));

create policy "Game substitutes can read assigned penalties" on public.penalties for select to authenticated
using(private.is_game_substitute(game_id));
create policy "Game substitutes can create assigned penalties" on public.penalties for insert to authenticated
with check(private.is_game_substitute(game_id) and (player_id is null or private.player_belongs_to_game(player_id,game_id)));
create policy "Game substitutes can update assigned penalties" on public.penalties for update to authenticated
using(private.is_game_substitute(game_id))
with check(private.is_game_substitute(game_id) and (player_id is null or private.player_belongs_to_game(player_id,game_id)));

create policy "Game substitutes can read assigned snap events" on public.snap_events for select to authenticated
using(private.is_game_substitute(game_id));
create policy "Game substitutes can create assigned snap events" on public.snap_events for insert to authenticated
with check(created_by=(select auth.uid()) and private.is_game_substitute(game_id));
create policy "Game substitutes can update assigned snap events" on public.snap_events for update to authenticated
using(private.is_game_substitute(game_id)) with check(private.is_game_substitute(game_id));
create policy "Game substitutes can read assigned snap participants" on public.snap_participants for select to authenticated
using(exists(select 1 from public.snap_events e where e.id=snap_event_id and private.is_game_substitute(e.game_id)));
create policy "Game substitutes can create assigned snap participants" on public.snap_participants for insert to authenticated
with check(exists(select 1 from public.snap_events e where e.id=snap_event_id and private.is_game_substitute(e.game_id) and private.player_belongs_to_game(player_id,e.game_id)));
create policy "Game substitutes can delete assigned snap participants" on public.snap_participants for delete to authenticated
using(exists(select 1 from public.snap_events e where e.id=snap_event_id and private.is_game_substitute(e.game_id)));

create or replace function public.sync_play(p_id uuid,p_game_id uuid,p_quarter integer,p_possession text,p_down integer,p_distance integer,p_play_type text,p_subtype text default null,p_yards integer default null,p_first_down boolean default false,p_turnover boolean default false,p_team_points integer default 0,p_opponent_points integer default 0,p_event_data jsonb default '{}'::jsonb,p_state_before jsonb default '{}'::jsonb,p_state_after jsonb default '{}'::jsonb,p_client_created_at timestamptz default null,p_client_updated_at timestamptz default null)
returns table(play_id uuid,sequence integer,revision integer,already_existed boolean)
language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=(select auth.uid());v_existing public.plays%rowtype;v_new public.plays%rowtype;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if not private.can_statkeep_game(p_game_id) or not private.team_has_statkeeping_access(private.game_team_id(p_game_id)) then raise exception 'not authorized to record stats'; end if;
  select * into v_existing from public.plays where id=p_id;
  if found then
    if v_existing.game_id<>p_game_id or v_existing.created_by<>v_user or v_existing.quarter is distinct from p_quarter or v_existing.possession is distinct from p_possession or v_existing.down is distinct from p_down or v_existing.distance is distinct from p_distance or v_existing.play_type is distinct from p_play_type or v_existing.subtype is distinct from p_subtype or v_existing.yards is distinct from p_yards or v_existing.first_down is distinct from p_first_down or v_existing.turnover is distinct from p_turnover or v_existing.team_points is distinct from p_team_points or v_existing.opponent_points is distinct from p_opponent_points or v_existing.event_data is distinct from coalesce(p_event_data,'{}'::jsonb) or v_existing.state_before is distinct from coalesce(p_state_before,'{}'::jsonb) or v_existing.state_after is distinct from coalesce(p_state_after,'{}'::jsonb) then raise exception 'play id conflict'; end if;
    return query select v_existing.id,v_existing.sequence,v_existing.revision,true;return;
  end if;
  insert into public.plays(id,game_id,created_by,sequence,quarter,possession,down,distance,play_type,subtype,yards,first_down,turnover,team_points,opponent_points,event_data,state_before,state_after,client_created_at,client_updated_at)
  values(p_id,p_game_id,v_user,1,p_quarter,p_possession,p_down,p_distance,p_play_type,p_subtype,p_yards,p_first_down,p_turnover,p_team_points,p_opponent_points,coalesce(p_event_data,'{}'::jsonb),coalesce(p_state_before,'{}'::jsonb),coalesce(p_state_after,'{}'::jsonb),p_client_created_at,p_client_updated_at) returning * into v_new;
  return query select v_new.id,v_new.sequence,v_new.revision,false;
exception when unique_violation then
  select * into v_existing from public.plays where id=p_id;
  if found and v_existing.game_id=p_game_id and v_existing.created_by=v_user and v_existing.quarter is not distinct from p_quarter and v_existing.possession is not distinct from p_possession and v_existing.down is not distinct from p_down and v_existing.distance is not distinct from p_distance and v_existing.play_type is not distinct from p_play_type and v_existing.subtype is not distinct from p_subtype and v_existing.yards is not distinct from p_yards and v_existing.first_down is not distinct from p_first_down and v_existing.turnover is not distinct from p_turnover and v_existing.team_points is not distinct from p_team_points and v_existing.opponent_points is not distinct from p_opponent_points and v_existing.event_data is not distinct from coalesce(p_event_data,'{}'::jsonb) and v_existing.state_before is not distinct from coalesce(p_state_before,'{}'::jsonb) and v_existing.state_after is not distinct from coalesce(p_state_after,'{}'::jsonb) then return query select v_existing.id,v_existing.sequence,v_existing.revision,true;return;end if;
  raise exception 'play id conflict';
end;
$$;
revoke all on function public.sync_play(uuid,uuid,integer,text,integer,integer,text,text,integer,boolean,boolean,integer,integer,jsonb,jsonb,jsonb,timestamptz,timestamptz) from public,anon;
grant execute on function public.sync_play(uuid,uuid,integer,text,integer,integer,text,text,integer,boolean,boolean,integer,integer,jsonb,jsonb,jsonb,timestamptz,timestamptz) to authenticated;

create or replace function private.revoke_game_substitute_after_final()
returns trigger language plpgsql security definer set search_path=''
as $$ begin
  if new.status='archived' and old.status is distinct from new.status then
    update private.game_statkeeper_assignments set revoked_at=coalesce(revoked_at,now()) where game_id=new.id and revoked_at is null;
    update private.game_statkeeper_invites set revoked_at=coalesce(revoked_at,now()) where game_id=new.id and revoked_at is null;
  end if;
  return new;
end $$;
revoke all on function private.revoke_game_substitute_after_final() from public,anon,authenticated;
drop trigger if exists revoke_game_substitute_after_final on public.games;
create trigger revoke_game_substitute_after_final after update of status on public.games
for each row execute function private.revoke_game_substitute_after_final();
