-- Sideline Stats V4.5.20 commercial access and trial onboarding.
alter table public.team_entitlements add column if not exists access_source text not null default 'standard';
alter table public.team_entitlements add column if not exists complimentary boolean not null default false;
alter table public.team_entitlements alter column coach_seat_limit set default 5;

alter table public.team_entitlements drop constraint if exists team_entitlements_tier_check;
alter table public.team_entitlements add constraint team_entitlements_tier_check check (tier in ('free','trial','statkeeper','coach','team_pro')) not valid;
alter table public.team_entitlements validate constraint team_entitlements_tier_check;
alter table public.billing_products drop constraint if exists billing_products_entitlement_tier_check;
alter table public.billing_products add constraint billing_products_entitlement_tier_check check (entitlement_tier in ('free','statkeeper','coach','team_pro')) not valid;
alter table public.billing_products validate constraint billing_products_entitlement_tier_check;

update public.billing_products set code='statkeeper_season',name='Sideline Stats Statkeeper',price_cents=1499,billing_interval='one_time',entitlement_tier='statkeeper',coach_seat_limit=null,active=true,updated_at=now() where code='statkeeper_annual';
update public.billing_products set code='team_pro_season',name='Sideline Stats Team Pro',price_cents=3999,billing_interval='one_time',entitlement_tier='team_pro',coach_seat_limit=5,active=true,updated_at=now() where code='coach_annual';

insert into public.billing_products(code,name,description,price_cents,currency,billing_interval,entitlement_tier,coach_seat_limit,active) values
('statkeeper_season','Sideline Stats Statkeeper','One team for one season',1499,'usd','one_time','statkeeper',null,true),
('team_pro_season','Sideline Stats Team Pro','Statkeeping, analytics, debriefs and five coaches for one season',3999,'usd','one_time','team_pro',5,true)
on conflict(code) do update set name=excluded.name,description=excluded.description,price_cents=excluded.price_cents,billing_interval=excluded.billing_interval,entitlement_tier=excluded.entitlement_tier,coach_seat_limit=excluded.coach_seat_limit,active=true,updated_at=now();

create or replace function private.start_trial_on_first_game() returns trigger language plpgsql security definer set search_path='' as $$
declare v_team_id uuid;
begin
  select s.team_id into v_team_id from public.seasons s where s.id=new.season_id;
  insert into public.team_entitlements(team_id,tier,trial_used,trial_started_at,trial_ends_at,coach_seat_limit,access_source,complimentary)
  values(v_team_id,'trial',true,now(),now()+interval '7 days',5,'standard',false)
  on conflict(team_id) do update set tier='trial',trial_used=true,trial_started_at=now(),trial_ends_at=now()+interval '7 days',updated_at=now()
  where public.team_entitlements.trial_used=false and public.team_entitlements.complimentary=false and public.team_entitlements.tier='free';
  return new;
end;$$;
drop trigger if exists start_trial_after_first_game on public.games;
create trigger start_trial_after_first_game after insert on public.games for each row execute function private.start_trial_on_first_game();
revoke all on function private.start_trial_on_first_game() from public,anon,authenticated;

-- New-team onboarding must also work for users manually confirmed in the Auth dashboard.
create or replace function private.handle_new_team() returns trigger language plpgsql security definer set search_path='' as $$
declare already_used boolean;
begin
  insert into public.profiles(id) values(new.owner_user_id) on conflict(id) do nothing;
  insert into public.team_members(team_id,user_id,is_admin,is_statkeeper,is_coach,status,joined_at)
  values(new.id,new.owner_user_id,true,true,true,'active',now())
  on conflict(team_id,user_id) do update set is_admin=true,is_statkeeper=true,status='active',joined_at=coalesce(public.team_members.joined_at,now());

  select coach_trial_used into already_used from public.profiles where id=new.owner_user_id for update;
  if not coalesce(already_used,false) then
    update public.profiles set coach_trial_used=true,updated_at=now() where id=new.owner_user_id;
    insert into public.team_entitlements(team_id,tier,trial_used,trial_started_at,trial_ends_at,coach_seat_limit,access_source,complimentary)
    values(new.id,'trial',true,now(),now()+interval '7 days',5,'standard',false)
    on conflict(team_id) do update set tier='trial',trial_used=true,trial_started_at=now(),trial_ends_at=now()+interval '7 days',coach_seat_limit=5,access_source='standard',complimentary=false,updated_at=now();
  else
    insert into public.team_entitlements(team_id,tier,trial_used,coach_seat_limit,access_source,complimentary)
    values(new.id,'free',true,5,'standard',false)
    on conflict(team_id) do nothing;
  end if;
  return new;
end;$$;
revoke all on function private.handle_new_team() from public,anon,authenticated;

-- Founder/test access is team-level, so all properly invited Erie users bypass checkout.
insert into public.team_entitlements(team_id,tier,trial_used,paid_access_starts_at,paid_access_ends_at,coach_seat_limit,access_source,complimentary)
values('269b41ea-4437-4879-9404-51fdd3463ed7','team_pro',true,now(),null,5,'founder_comp',true)
on conflict(team_id) do update set tier='team_pro',paid_access_ends_at=null,coach_seat_limit=5,access_source='founder_comp',complimentary=true,updated_at=now();
