-- Persist Hardcourt team identity/settings in the shared teams table.
create or replace function public.update_hardcourt_team_profile(
  p_team_id uuid,
  p_name text,
  p_grade text default null,
  p_primary text default null,
  p_accent text default null,
  p_logo_data text default null
)
returns void
language plpgsql
security definer
set search_path='public','private','auth','pg_temp'
as $$
begin
  if auth.uid() is null or not private.can_manage_team(p_team_id) then
    raise exception 'Not authorized to manage this team';
  end if;
  if not exists(select 1 from public.teams where id=p_team_id and sport='basketball') then
    raise exception 'Hardcourt team not found';
  end if;

  update public.teams
  set name=coalesce(nullif(trim(p_name),''),name),
      grade=nullif(trim(coalesce(p_grade,'')),''),
      primary_color=coalesce(nullif(p_primary,''),primary_color),
      accent_color=coalesce(nullif(p_accent,''),accent_color),
      logo_data=coalesce(p_logo_data,logo_data),
      updated_at=now()
  where id=p_team_id;
end;
$$;

revoke all on function public.update_hardcourt_team_profile(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.update_hardcourt_team_profile(uuid,text,text,text,text,text) to authenticated;
