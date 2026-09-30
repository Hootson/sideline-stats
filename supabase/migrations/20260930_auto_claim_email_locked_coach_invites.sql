create or replace function public.claim_my_pending_coach_invites()
returns table(team_id uuid, member_role text, team_name text)
language plpgsql
security definer
set search_path = 'public', 'private', 'auth', 'extensions', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_inv private.team_invites%rowtype;
  v_existing_coach boolean;
  v_coach_count integer;
begin
  if v_uid is null then raise exception 'Sign in to claim coach invitations'; end if;
  select lower(btrim(u.email)) into v_email from auth.users u where u.id=v_uid;
  if coalesce(v_email,'')='' then return; end if;

  for v_inv in
    select i.* from private.team_invites i
    where i.role='coach'
      and lower(btrim(i.intended_email))=v_email
      and i.revoked_at is null
      and i.expires_at>now()
      and i.use_count<i.max_uses
    order by i.created_at
    for update
  loop
    select exists(select 1 from public.team_members m where m.team_id=v_inv.team_id and m.user_id=v_uid and m.status='active' and m.is_coach)
      into v_existing_coach;
    select count(*) into v_coach_count from public.team_members m where m.team_id=v_inv.team_id and m.status='active' and m.is_coach;
    if v_existing_coach or v_coach_count<5 then
      insert into public.team_members(team_id,user_id,is_admin,is_statkeeper,is_coach,status)
      values (v_inv.team_id,v_uid,false,false,true,'active')
      on conflict on constraint team_members_team_id_user_id_key do update set is_coach=true,status='active';

      update private.team_invites
      set use_count=case when v_existing_coach then use_count else least(max_uses,use_count+1) end,
          revoked_at=now()
      where id=v_inv.id;

      return query select t.id,'coach'::text,t.name from public.teams t where t.id=v_inv.team_id;
    end if;
  end loop;
end;
$function$;

grant execute on function public.claim_my_pending_coach_invites() to authenticated;
