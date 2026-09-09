-- Sideline Stats V4.5.13
-- Reusable team invitation links for authenticated viewer, coach, or statkeeper accounts.

create table if not exists private.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  role text not null check (role in ('viewer','coach','statkeeper')),
  token_hash text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  max_uses integer not null default 100 check (max_uses between 1 and 500),
  use_count integer not null default 0 check (use_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists team_invites_team_id_idx on private.team_invites(team_id);
revoke all on private.team_invites from public, anon, authenticated;

create or replace function public.create_team_invite(
  p_team_id uuid,
  p_role text default 'viewer',
  p_expires_days integer default 7
)
returns text
language plpgsql
security definer
set search_path to 'public', 'private', 'auth', 'extensions', 'pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_token text;
begin
  if v_uid is null then raise exception 'Sign in to create a team invitation'; end if;
  if not private.can_manage_team(p_team_id) then raise exception 'Not authorized to invite this team'; end if;
  if p_role not in ('viewer','coach','statkeeper') then raise exception 'Invalid team role'; end if;
  if p_expires_days not between 1 and 30 then raise exception 'Invitation must expire within 1 to 30 days'; end if;

  v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  insert into private.team_invites(team_id, role, token_hash, created_by, expires_at)
  values (p_team_id, p_role, encode(digest(v_token,'sha256'),'hex'), v_uid, now() + make_interval(days => p_expires_days));
  return v_token;
end;
$$;

revoke all on function public.create_team_invite(uuid,text,integer) from public, anon;
grant execute on function public.create_team_invite(uuid,text,integer) to authenticated;

create or replace function public.redeem_team_invite(p_token text)
returns table(team_id uuid, member_role text, team_name text)
language plpgsql
security definer
set search_path to 'public', 'private', 'auth', 'extensions', 'pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_inv private.team_invites%rowtype;
  v_existing boolean;
begin
  if v_uid is null then raise exception 'Sign in or create an account to join this team'; end if;
  if p_token is null or length(p_token) < 32 then raise exception 'Team invitation is invalid'; end if;

  select * into v_inv
    from private.team_invites i
   where i.token_hash = encode(digest(p_token,'sha256'),'hex')
   for update;
  if not found or v_inv.revoked_at is not null then raise exception 'Team invitation is invalid'; end if;
  if v_inv.expires_at <= now() then raise exception 'Team invitation has expired'; end if;

  select exists(
    select 1 from public.team_members m
     where m.team_id=v_inv.team_id and m.user_id=v_uid and m.status='active'
  ) into v_existing;
  if not v_existing and v_inv.use_count >= v_inv.max_uses then raise exception 'Team invitation has reached its use limit'; end if;

  insert into public.team_members(team_id,user_id,is_admin,is_statkeeper,is_coach,status)
  values (
    v_inv.team_id,
    v_uid,
    false,
    v_inv.role='statkeeper',
    v_inv.role='coach',
    'active'
  )
  on conflict on constraint team_members_team_id_user_id_key do update set
    is_statkeeper=public.team_members.is_statkeeper or excluded.is_statkeeper,
    is_coach=public.team_members.is_coach or excluded.is_coach,
    status='active';

  if not v_existing then
    update private.team_invites set use_count=use_count+1 where id=v_inv.id;
  end if;

  return query select t.id, v_inv.role, t.name from public.teams t where t.id=v_inv.team_id;
end;
$$;

revoke all on function public.redeem_team_invite(text) from public, anon;
grant execute on function public.redeem_team_invite(text) to authenticated;
