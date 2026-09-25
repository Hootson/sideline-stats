-- Bleacher Butt Stats Hardcourt commercial onboarding
-- Mirrors the current Gridiron account/team entitlement flow.

create or replace function public.create_hardcourt_team(
  p_name text,
  p_grade text,
  p_primary text default '#111111',
  p_accent text default '#39a852'
)
returns table(team_id uuid, season_id uuid)
language plpgsql
security definer
set search_path='public','private','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_team uuid;
  v_season uuid;
begin
  if v_uid is null then
    raise exception 'Sign in to create a Hardcourt team';
  end if;
  if nullif(trim(p_name),'') is null then
    raise exception 'Team name is required';
  end if;

  insert into public.teams(owner_user_id,name,grade,primary_color,accent_color,sport)
  values(v_uid,trim(p_name),nullif(trim(p_grade),''),p_primary,p_accent,'basketball')
  returning id into v_team;

  -- Shared on_team_created handles owner membership and the same commercial
  -- trial/free entitlement logic used by Gridiron.
  insert into public.seasons(team_id,name,season_year,status)
  values(v_team,extract(year from now())::int::text,extract(year from now())::int,'active')
  returning id into v_season;

  return query select v_team,v_season;
end;
$$;

revoke all on function public.create_hardcourt_team(text,text,text,text) from public,anon;
grant execute on function public.create_hardcourt_team(text,text,text,text) to authenticated;
