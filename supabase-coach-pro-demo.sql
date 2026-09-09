-- Reversible Coach Pro demo data for Erie Week 2 and Week 3.
-- This never updates teams, games, plays, credits, scores, or statistics.

begin;

with calls(number,name) as (
  values
    (1,'I Left 24 ISO Weak'),(2,'I Right 23 ISO Strong'),(3,'Power Right'),
    (4,'Power Left'),(5,'Counter Right'),(6,'Counter Left'),(7,'Sweep Right'),
    (8,'Sweep Left'),(9,'Jet Right'),(10,'Jet Left'),(11,'QB Keep Right'),
    (12,'QB Keep Left'),(13,'Boot Right Flood'),(14,'Boot Left Flood'),
    (15,'Quick Slant'),(16,'Hitch'),(17,'Smash'),(18,'Four Verticals'),
    (19,'Screen Right'),(20,'Screen Left'),(21,'Tight End Pop'),
    (22,'Waggle Right'),(23,'Waggle Left'),(24,'Goal Line Power'),(25,'Victory')
)
insert into public.coach_demo_playbook(team_id,call_number,call_name)
select '269b41ea-4437-4879-9404-51fdd3463ed7'::uuid,number,name from calls
on conflict (team_id,call_number) do update set call_name=excluded.call_name;

with calls(number,name) as (
  values
    (1,'I Left 24 ISO Weak'),(2,'I Right 23 ISO Strong'),(3,'Power Right'),
    (4,'Power Left'),(5,'Counter Right'),(6,'Counter Left'),(7,'Sweep Right'),
    (8,'Sweep Left'),(9,'Jet Right'),(10,'Jet Left'),(11,'QB Keep Right'),
    (12,'QB Keep Left'),(13,'Boot Right Flood'),(14,'Boot Left Flood'),
    (15,'Quick Slant'),(16,'Hitch'),(17,'Smash'),(18,'Four Verticals'),
    (19,'Screen Right'),(20,'Screen Left')
), ranked as (
  select p.id,g.week_number,row_number() over(partition by g.week_number order by p.sequence,p.id) rn
  from public.plays p join public.games g on g.id=p.game_id
  where g.season_id='6fc38578-dfee-45f4-8b17-70848f33de0d'
    and g.week_number in (2,3) and p.deleted_at is null and p.play_type in ('Rush','Pass')
), assigned as (
  select r.id,c.number,c.name from ranked r join calls c
  on c.number=case when r.week_number=2 then ((r.rn-1)%15)+1 else ((r.rn-1)%15)+6 end
)
insert into public.coach_demo_play_calls(play_id,team_id,play_call)
select id,'269b41ea-4437-4879-9404-51fdd3463ed7'::uuid,
  jsonb_build_object('id',format('demo-play-%s',lpad(number::text,2,'0')),'number',number,'name',name,'demo',true)
from assigned on conflict (play_id) do update set play_call=excluded.play_call;

commit;

-- Cleanup when testing is complete:
-- delete from public.coach_demo_play_calls where team_id='269b41ea-4437-4879-9404-51fdd3463ed7';
-- delete from public.coach_demo_playbook where team_id='269b41ea-4437-4879-9404-51fdd3463ed7';
