-- Hardcourt sharing + coach-seat management. Reuses team_members and team entitlement model.
create table if not exists private.hardcourt_share_invites(
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
 role text not null check(role in ('coach','viewer')), token_hash text not null unique, intended_email text,
 created_by uuid not null references auth.users(id) on delete cascade, expires_at timestamptz not null,
 redeemed_by uuid references auth.users(id) on delete set null, redeemed_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now());
revoke all on private.hardcourt_share_invites from public,anon,authenticated;

create or replace function public.create_hardcourt_share_invite(p_team_id uuid,p_role text,p_email text default null,p_expires_days integer default 7)
returns text language plpgsql security definer set search_path='public','private','auth','extensions','pg_temp' as $$
declare v_token text; v_email text:=lower(btrim(coalesce(p_email,''))); v_limit int:=5; v_coaches int;
begin
 if auth.uid() is null or not private.can_manage_team(p_team_id) then raise exception 'Only a team statkeeper can create sharing links'; end if;
 if p_role not in ('coach','viewer') then raise exception 'Invalid sharing role'; end if;
 if p_role='coach' then
   if v_email='' or position('@' in v_email)<2 then raise exception 'Enter a valid coach email'; end if;
   if not private.team_has_statkeeping_access(p_team_id) then raise exception 'An active team plan is required'; end if;
   select count(*) into v_coaches from public.team_members where team_id=p_team_id and role='coach' and status='active';
   if v_coaches>=v_limit then raise exception 'This team already has 5 coach seats in use'; end if;
 end if;
 v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into private.hardcourt_share_invites(team_id,role,token_hash,intended_email,created_by,expires_at)
 values(p_team_id,p_role,encode(digest(v_token,'sha256'),'hex'),nullif(v_email,''),auth.uid(),now()+make_interval(days=>greatest(1,least(p_expires_days,3650))));
 return v_token;
end$$;
revoke all on function public.create_hardcourt_share_invite(uuid,text,text,integer) from public,anon;
grant execute on function public.create_hardcourt_share_invite(uuid,text,text,integer) to authenticated;

create or replace function public.redeem_hardcourt_share_invite(p_token text)
returns table(team_id uuid,member_role text,team_name text) language plpgsql security definer set search_path='public','private','auth','extensions','pg_temp' as $$
declare v private.hardcourt_share_invites%rowtype; v_email text;
begin
 if auth.uid() is null then raise exception 'Sign in or create an account to accept this invitation'; end if;
 select * into v from private.hardcourt_share_invites where token_hash=encode(digest(p_token,'sha256'),'hex') for update;
 if not found or v.revoked_at is not null or v.expires_at<=now() then raise exception 'This invitation is invalid or expired'; end if;
 select lower(email) into v_email from auth.users where id=auth.uid();
 if v.intended_email is not null and v.intended_email<>v_email then raise exception 'This invitation was sent to a different email address'; end if;
 insert into public.team_members(team_id,user_id,role,status) values(v.team_id,auth.uid(),v.role,'active')
 on conflict(team_id,user_id) do update set role=excluded.role,status='active';
 update private.hardcourt_share_invites set redeemed_by=auth.uid(),redeemed_at=coalesce(redeemed_at,now()) where id=v.id;
 return query select v.team_id,v.role,t.name from public.teams t where t.id=v.team_id;
end$$;
revoke all on function public.redeem_hardcourt_share_invite(text) from public,anon;
grant execute on function public.redeem_hardcourt_share_invite(text) to authenticated;

create or replace function public.get_hardcourt_team_members(p_team_id uuid)
returns table(user_id uuid,email text,member_role text,status text) language sql stable security definer set search_path='' as $$
 select tm.user_id,lower(u.email),tm.role::text,tm.status::text from public.team_members tm join auth.users u on u.id=tm.user_id
 where tm.team_id=p_team_id and private.can_manage_team(p_team_id) order by tm.role,u.email;
$$;
revoke all on function public.get_hardcourt_team_members(uuid) from public,anon;
grant execute on function public.get_hardcourt_team_members(uuid) to authenticated;

create or replace function public.remove_hardcourt_team_member(p_team_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not private.can_manage_team(p_team_id) then raise exception 'Not authorized'; end if;
 if p_user_id=auth.uid() then raise exception 'You cannot remove yourself here'; end if;
 update public.team_members set status='removed' where team_id=p_team_id and user_id=p_user_id;
 return found;
end$$;
revoke all on function public.remove_hardcourt_team_member(uuid,uuid) from public,anon;
grant execute on function public.remove_hardcourt_team_member(uuid,uuid) to authenticated;
