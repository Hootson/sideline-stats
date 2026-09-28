import {loadHardcourtTeams,createHardcourtTeam,preferredHardcourtTeam,rememberHardcourtTeam} from './cloud-account.js';

// Reusable account/onboarding controller. It never owns or mutates live game data.
export async function resolveHardcourtAccount(sb,user){
  if(!sb||!user) return {status:'signed_out',team:null,teams:[],error:null};
  try{
    const teams=await loadHardcourtTeams(sb);
    if(!teams.length) return {status:'needs_team',team:null,teams:[],error:null};
    const team=preferredHardcourtTeam(teams);
    if(!team) return {status:'needs_team',team:null,teams,error:null};
    rememberHardcourtTeam(team.teamId||team.team_id);
    return {status:'ready',team,teams,error:null};
  }catch(error){return {status:'unavailable',team:null,teams:[],error}}
}

export async function provisionFirstHardcourtTeam(sb,profile){
  if(!sb) return {status:'unavailable',team:null,teams:[],error:new Error('Hardcourt account service is unavailable.')};
  try{
    const created=await createHardcourtTeam(sb,profile);
    const id=created?.team_id||created?.teamId;
    if(!id) throw new Error('Hardcourt did not receive the new team ID.');
    rememberHardcourtTeam(id);
    const teams=await loadHardcourtTeams(sb);
    const team=teams.find(x=>String(x.teamId||x.team_id)===String(id));
    if(!team) return {status:'created_pending_refresh',team:null,teams,error:null,created};
    return {status:'ready',team,teams,error:null,created};
  }catch(error){return {status:'error',team:null,teams:[],error}}
}

export function selectHardcourtTeam(teams,teamId){
  if(teamId===null||teamId===undefined||teamId==='') return null;
  const team=(teams||[]).find(x=>String(x.teamId||x.team_id)===String(teamId));
  if(team) rememberHardcourtTeam(team.teamId||team.team_id);
  return team||null;
}

export function hydrateHardcourtState(state,team){
  if(!state||!team) return state;
  const teamId=team.teamId||team.team_id,seasonId=team.seasonId||team.season_id;
  if(!teamId||!seasonId) return state;
  const same=String(state.cloudTeamId||'')===String(teamId);
  const next={...state,cloudTeamId:teamId,cloudSeasonId:seasonId,team:team.teamName||team.team_name||state.team,grade:team.grade||state.grade||'',primary:team.primary||team.primary_color||state.primary||'#111111',accent:team.accent||team.accent_color||state.accent||'#39a852',hardcourtCloudRecognized:true};
  if(team.logo||team.logo_data) next.teamLogo=team.logo||team.logo_data;
  if(!same){next.events=[];next.minutes={};next.running=false;next.lastTick=null;next.gameId=null;next.cloudGameId=null;next.pendingShot=null;next.pendingAction=null;next.selectedPlayer=null;next.selectedAction=null;next.shotAssistPending=null;next.reboundPending=null}
  return next;
}

export function teamPickerMarkup(teams,escapeHtml=(x)=>String(x??'')){
  const valid=(teams||[]).filter(t=>(t?.teamId||t?.team_id)&&String(t?.teamName||t?.team_name||'').trim().toLowerCase()!=='my team');
  if(!valid.length) return '';
  return '<div class="hc-team-picker"><label>Team<select id="hcActiveTeam">'+valid.map(t=>'<option value="'+escapeHtml(t.teamId||t.team_id)+'">'+escapeHtml(t.teamName||t.team_name||'Team')+'</option>').join('')+'</select></label></div>';
}
