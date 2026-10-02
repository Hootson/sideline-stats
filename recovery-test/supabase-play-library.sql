-- Sideline Stats V4.5.16: weekly game-plan assignments.
-- Master play concepts remain in teams.playbook with their permanent IDs.

alter table public.games
  add column if not exists game_plan jsonb;

comment on column public.games.game_plan is
  'Per-game play-number assignments: [{"playId":"permanent-play-id","number":12}]';

alter table public.games
  drop constraint if exists games_game_plan_is_array;

alter table public.games
  add constraint games_game_plan_is_array
  check (game_plan is null or jsonb_typeof(game_plan) = 'array')
  not valid;

alter table public.games
  validate constraint games_game_plan_is_array;
