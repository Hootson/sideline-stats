import {loadHardcourtTeams,createHardcourtTeam,preferredHardcourtTeam,rememberHardcourtTeam} from './cloud-account.js';

// Account/onboarding controller for Hardcourt. This deliberately does not own
// game state; it returns the selected persistent team to app.js.
export async function resolveHardcourtAccount(sb,user){
  if(!sb||!user) return {status:'signed_out',team:null,teams:[]};
  const teams=await loadHardcourtTeams(sb);
  if(!teams.length) return {status:'needs_team',team:null,teams:[]};
  const team=preferredHardcourtTeam(teams);
  rememberHardcourtTeam(team?.teamId);
  return {status:'ready',team,teams};
}

export async function provisionFirstHardcourtTeam(sb,profile){
  const created=await createHardcourtTeam(sb,profile);
  rememberHardcourtTeam(created?.team_id);
  const teams=await loadHardcourtTeams(sb);
  const team=teams.find(x=>String(x.teamId)===String(created?.team_id))||preferredHardcourtTeam(teams);
  return {status:'ready',team,teams};
}

export function selectHardcourtTeam(teams,teamId){
  const team=(teams||[]).find(x=>String(x.teamId)===String(teamId));
  if(team) rememberHardcourtTeam(team.teamId);
  return team||null;
}

export function hydrateHardcourtState(state,team){
  if(!state||!team) return state;
  state.cloudTeamId=team.teamId;
  state.cloudSeasonId=team.seasonId;
  state.team=team.teamName||state.team;
  state.grade=team.grade||state.grade||'';
  state.primary=team.primary||state.primary||'#111111';
  state.accent=team.accent||state.accent||'#39a852';
  if(team.logo) state.teamLogo=team.logo;
  return state;
}

export function teamPickerMarkup(teams,escapeHtml=(x)=>String(x??'')){
  if(!teams?.length) return '';
  return '<div class="hc-team-picker"><label>Team<select id="hcActiveTeam">'+teams.map(t=>'<option value="'+escapeHtml(t.teamId)+'">'+escapeHtml(t.teamName||'Team')+'</option>').join('')+'</select></label></div>';
}
