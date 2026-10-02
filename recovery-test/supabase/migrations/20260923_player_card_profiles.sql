alter table public.players
  add column if not exists primary_position text,
  add column if not exists secondary_position text,
  add column if not exists action_photo_data text,
  add column if not exists headshot_data text,
  add column if not exists action_photo_crop jsonb not null default '{"scale":1,"x":0,"y":0}'::jsonb,
  add column if not exists headshot_crop jsonb not null default '{"scale":1,"x":0,"y":0}'::jsonb;

create or replace function public.get_public_player_card_profiles(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'extensions', 'pg_temp'
as $$
declare
  v_team_id uuid;
  v_season_id uuid;
  v_result jsonb;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'Viewer link is invalid';
  end if;

  select i.team_id into v_team_id
    from private.team_invites i
   where i.token_hash = encode(digest(p_token,'sha256'),'hex')
     and i.role = 'viewer'
     and i.revoked_at is null
     and i.expires_at > now()
     and i.use_count < i.max_uses
   order by i.created_at desc
   limit 1;

  if v_team_id is null then raise exception 'Viewer link is invalid or expired'; end if;

  select s.id into v_season_id
    from public.seasons s
   where s.team_id=v_team_id
   order by (s.status='active') desc, s.created_at desc
   limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,
    'jersey',p.jersey_number,
    'name',p.name,
    'primary_position',p.primary_position,
    'secondary_position',p.secondary_position,
    'action_photo_data',p.action_photo_data,
    'headshot_data',p.headshot_data,
    'action_photo_crop',p.action_photo_crop,
    'headshot_crop',p.headshot_crop
  ) order by nullif(regexp_replace(coalesce(p.jersey_number,''),'[^0-9]','','g'),'')::int nulls last, p.name), '[]'::jsonb)
    into v_result
    from public.players p
   where p.season_id=v_season_id and p.active is distinct from false;

  return v_result;
end;
$$;

revoke all on function public.get_public_player_card_profiles(text) from public;
grant execute on function public.get_public_player_card_profiles(text) to anon, authenticated;
