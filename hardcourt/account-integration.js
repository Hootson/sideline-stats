import {resolveHardcourtAccount,provisionFirstHardcourtTeam,selectHardcourtTeam,hydrateHardcourtState,teamPickerMarkup} from './account-flow.js';
import {hardcourtTrialLabel} from './commercial-config.js';
export function createHardcourtAccountIntegration({sb,getUser,getState,onTeamChanged,escapeHtml}){let teams=[];
 async function refresh(){const result=await resolveHardcourtAccount(sb,getUser());teams=result.teams||[];if(result.team){hydrateHardcourtState(getState(),result.team);await onTeamChanged?.(result.team)}return result}
 async function startTrial(team){if(!team?.teamId)return;const {error}=await sb.rpc('start_hardcourt_team_trial',{p_team_id:team.teamId});if(error&&!/already used|paid access/i.test(error.message||''))throw error}
 async function createTeam(profile){const result=await provisionFirstHardcourtTeam(sb,profile);teams=result.teams||[];if(result.team){await startTrial(result.team);hydrateHardcourtState(getState(),result.team);await onTeamChanged?.(result.team)}return result}
 async function switchTeam(teamId){const team=selectHardcourtTeam(teams,teamId);if(!team)return null;hydrateHardcourtState(getState(),team);await onTeamChanged?.(team);return team}
 function accountSummaryMarkup(email){const state=getState();return '<div class="hc-account-welcome"><div><span class="hc-preview-badge">'+escapeHtml(hardcourtTrialLabel())+'</span><h3>'+escapeHtml(state.team||'Hardcourt')+'</h3><p>'+escapeHtml(email||'')+'</p></div><div class="hc-account-role"><strong>TEAM PRO</strong><span>TRIAL</span></div>'+(teams.length>1?teamPickerMarkup(teams,escapeHtml):'')+'<div class="hc-cloud-ready">Team and roster saved to your Bleacher Butt Stats account</div></div>'}
 return {refresh,createTeam,startTrial,switchTeam,accountSummaryMarkup,getTeams:()=>[...teams]}}
