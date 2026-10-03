import {resolveHardcourtAccount,provisionFirstHardcourtTeam,selectHardcourtTeam,hydrateHardcourtState,teamPickerMarkup} from './account-flow.js';
import {HARDCOURT_COMMERCIAL,hardcourtAccessLabel} from './commercial-config.js';

// Thin adapter consumed by app.js. Keeping this module DOM-light lets the live
// game remain isolated while account persistence is rolled out.
export function createHardcourtAccountIntegration({sb,getUser,getState,onTeamChanged,escapeHtml}){
  let teams=[];

  async function refresh(){
    const result=await resolveHardcourtAccount(sb,getUser());
    teams=result.teams||[];
    if(result.team){
      hydrateHardcourtState(getState(),result.team);
      await onTeamChanged?.(result.team);
    }
    return result;
  }

  async function createTeam(profile){
    const result=await provisionFirstHardcourtTeam(sb,profile);
    teams=result.teams||[];
    if(result.team){
      hydrateHardcourtState(getState(),result.team);
      await onTeamChanged?.(result.team);
    }
    return result;
  }

  async function switchTeam(teamId){
    const team=selectHardcourtTeam(teams,teamId);
    if(!team) return null;
    hydrateHardcourtState(getState(),team);
    await onTeamChanged?.(team);
    return team;
  }

  function accountSummaryMarkup(email){
    const state=getState();
    return '<div class="hc-account-welcome">'+
      '<div><span class="hc-preview-badge">Free During Preview</span><h3>'+escapeHtml(state.team||'Hardcourt')+'</h3><p>'+escapeHtml(email||'')+'</p></div>'+
      '<div class="hc-account-role"><strong>'+escapeHtml(hardcourtAccessLabel())+'</strong><span>ACTIVE</span></div>'+
      (teams.length>1?teamPickerMarkup(teams,escapeHtml):'')+
      '<div class="hc-cloud-ready">Team and roster saved to your Bleacher Butt Stats account</div>'+
    '</div>';
  }

  return {refresh,createTeam,switchTeam,accountSummaryMarkup,getTeams:()=>[...teams],paidAccessEnabled:()=>HARDCOURT_COMMERCIAL.paidAccessEnabled};
}
