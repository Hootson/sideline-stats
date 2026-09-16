drop policy if exists "Team managers can create players" on public.players;
create policy "Team managers can create players" on public.players
for insert to authenticated
with check (
  exists (
    select 1 from public.seasons s
    where s.id = players.season_id
      and private.can_manage_team(s.team_id)
      and private.team_has_statkeeping_access(s.team_id)
  )
);

drop policy if exists "Team managers can update players" on public.players;
create policy "Team managers can update players" on public.players
for update to authenticated
using (
  exists (
    select 1 from public.seasons s
    where s.id = players.season_id
      and private.can_manage_team(s.team_id)
      and private.team_has_statkeeping_access(s.team_id)
  )
)
with check (
  exists (
    select 1 from public.seasons s
    where s.id = players.season_id
      and private.can_manage_team(s.team_id)
      and private.team_has_statkeeping_access(s.team_id)
  )
);

drop policy if exists "Team managers can create seasons" on public.seasons;
create policy "Team managers can create seasons" on public.seasons
for insert to authenticated
with check (
  private.can_manage_team(team_id)
  and private.team_has_statkeeping_access(team_id)
);

drop policy if exists "Team managers can update seasons" on public.seasons;
create policy "Team managers can update seasons" on public.seasons
for update to authenticated
using (
  private.can_manage_team(team_id)
  and private.team_has_statkeeping_access(team_id)
)
with check (
  private.can_manage_team(team_id)
  and private.team_has_statkeeping_access(team_id)
);
