alter table public.players
  add column if not exists primary_position text,
  add column if not exists secondary_position text,
  add column if not exists action_photo_data text,
  add column if not exists headshot_data text,
  add column if not exists action_photo_crop jsonb not null default '{"scale":1,"x":0,"y":0}'::jsonb,
  add column if not exists headshot_crop jsonb not null default '{"scale":1,"x":0,"y":0}'::jsonb;
