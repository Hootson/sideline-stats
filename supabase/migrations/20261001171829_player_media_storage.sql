insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('player-media','player-media',true,1048576,array['image/jpeg','image/webp','image/png'])
on conflict (id) do update set public=true,file_size_limit=1048576,allowed_mime_types=array['image/jpeg','image/webp','image/png'];

alter table public.players add column if not exists action_photo_path text;
alter table public.players add column if not exists headshot_path text;

drop policy if exists "team statkeepers upload player media" on storage.objects;
create policy "team statkeepers upload player media" on storage.objects for insert to authenticated
with check (
  bucket_id='player-media'
  and exists (
    select 1 from public.players p
    join public.seasons s on s.id=p.season_id
    where p.id::text=(storage.foldername(storage.objects.name))[1]
      and private.can_manage_team(s.team_id)
  )
);

drop policy if exists "team statkeepers update player media" on storage.objects;
create policy "team statkeepers update player media" on storage.objects for update to authenticated
using (
  bucket_id='player-media'
  and exists (
    select 1 from public.players p join public.seasons s on s.id=p.season_id
    where p.id::text=(storage.foldername(storage.objects.name))[1]
      and private.can_manage_team(s.team_id)
  )
)
with check (
  bucket_id='player-media'
  and exists (
    select 1 from public.players p join public.seasons s on s.id=p.season_id
    where p.id::text=(storage.foldername(storage.objects.name))[1]
      and private.can_manage_team(s.team_id)
  )
);

drop policy if exists "team statkeepers delete player media" on storage.objects;
create policy "team statkeepers delete player media" on storage.objects for delete to authenticated
using (
  bucket_id='player-media'
  and exists (
    select 1 from public.players p join public.seasons s on s.id=p.season_id
    where p.id::text=(storage.foldername(storage.objects.name))[1]
      and private.can_manage_team(s.team_id)
  )
);
