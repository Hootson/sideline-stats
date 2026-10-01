create or replace function public.get_public_player_card_profiles(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $function$
declare
  v_team_id uuid;
  v_season_id uuid;
  v_result jsonb;
  v_media_base text := 'https://eyuvgzhkhcpwtcbmsvct.supabase.co/storage/v1/object/public/player-media/';
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
    'action_photo_data',case when p.action_photo_path is not null then v_media_base || p.action_photo_path else p.action_photo_data end,
    'headshot_data',case when p.headshot_path is not null then v_media_base || p.headshot_path else p.headshot_data end,
    'action_photo_path',p.action_photo_path,
    'headshot_path',p.headshot_path,
    'action_photo_crop',p.action_photo_crop,
    'headshot_crop',p.headshot_crop
  ) order by nullif(regexp_replace(coalesce(p.jersey_number,''),'[^0-9]','','g'),'')::int nulls last, p.name), '[]'::jsonb)
    into v_result
    from public.players p
   where p.season_id=v_season_id and p.active is distinct from false;

  return v_result;
end;
$function$;
