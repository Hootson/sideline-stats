-- Cover foreign-key lookups used for invite cleanup and assignment audits.

create index if not exists game_statkeeper_invites_team_idx on private.game_statkeeper_invites(team_id);
create index if not exists game_statkeeper_invites_season_idx on private.game_statkeeper_invites(season_id);
create index if not exists game_statkeeper_invites_creator_idx on private.game_statkeeper_invites(created_by);
create index if not exists game_statkeeper_invites_redeemed_idx on private.game_statkeeper_invites(redeemed_by) where redeemed_by is not null;
create index if not exists game_statkeeper_assignments_team_idx on private.game_statkeeper_assignments(team_id);
create index if not exists game_statkeeper_assignments_season_idx on private.game_statkeeper_assignments(season_id);
create index if not exists game_statkeeper_assignments_inviter_idx on private.game_statkeeper_assignments(invited_by);
create index if not exists game_statkeeper_assignments_invite_idx on private.game_statkeeper_assignments(invite_id) where invite_id is not null;
