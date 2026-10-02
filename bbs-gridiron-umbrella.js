// Bleacher Butt Stats bridge. IMPORTANT: the bridge chooses a team, but app.js owns loading that team's data.
(function(){
const PREF='bbs-account-preferences',DATA='sidelineStatsData',USER='bbs-gridiron-user',LAST='sidelineStatsLastTeam:',URL='https://eyuvgzhkhcpwtcbmsvct.supabase.co',KEY='sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l';
let sb=null,teams=[],uid='';
function read(k=PREF){try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return{}}}
function write(p){localStorage.setItem(PREF,JSON.stringify({...read(),...p,updatedAt:Date.now()}))}
function localState(){return read(DATA)}
function localTeam(){return localState()?.cloud?.teamId||null}
function remember(id){if(!id)return;write({lastEdition:'gridiron',lastGridironTeam:String(id)});if(uid)localStorage.setItem(LAST+uid,String(id))}
function completeFor(teamId){const s=localState();return String(s?.cloud?.teamId||'')===String(teamId)&&Array.isArray(s.roster)&&s.roster.length>0&&Array.isArray(s.games)&&s.games.length>0&&s.cloud?.remoteFingerprint}
function resetForAuthoritativeLoad(teamId){
  // Preserve no synthetic team shell here. V4.6.67's normal loadTeamFromCloud must construct the complete state.
  remember(teamId);
  localStorage.removeItem(DATA);
  localStorage.removeItem('sidelineStatsRecovery');
}
function sports(){location.href='./hardcourt-account-preview/?umbrella=1&from=gridiron'}
function setupAnother(){location.href='./?setup=gridiron&newTeam=1'}
function valid(t){return t?.team_id&&String(t.team_name||'').trim().toLowerCase()!=='my team'}
function signedOutUi(){teams=[];document.getElementById('bbsGridironTeams')?.remove();document.getElementById('bbsTeamPicker')?.remove();document.getElementById('bbsMySportsGridiron')?.remove()}
async function cloud(){
  if(!window.supabase?.createClient)return[];
  sb=sb||window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const session=(await sb.auth.getSession()).data?.session;
  if(!session?.user){signedOutUi();localStorage.removeItem(USER);return[]}
  uid=String(session.user.id||'');localStorage.setItem(USER,uid);
  const r=await sb.rpc('get_gridiron_cloud_context');teams=(r.error?[]:(r.data||[])).filter(valid);return teams;
}
async function recognize(){
  const ts=await cloud();if(!ts.length)return;
  const pref=read(),current=localTeam();
  const pick=ts.find(t=>String(t.team_id)===String(current))||ts.find(t=>String(t.team_id)===String(pref.lastGridironTeam))||ts[0];
  if(!pick)return;
  remember(pick.team_id);
  // Repair the exact broken state we created earlier: Erie IDs/team name existed locally, but the actual roster/games/playbook/stats had never been loaded.
  if(!completeFor(pick.team_id)){
    const marker='bbs-gridiron-authoritative-load:'+uid+':'+pick.team_id;
    if(sessionStorage.getItem(marker)!=='1'){
      sessionStorage.setItem(marker,'1');resetForAuthoritativeLoad(pick.team_id);location.reload();return;
    }
  }
  addSports();addSwitcher();
}
function addSwitcher(){let b=document.getElementById('bbsGridironTeams');if(!b){b=document.createElement('button');b.id='bbsGridironTeams';b.type='button';b.style.cssText='position:fixed;right:10px;bottom:56px;z-index:9990;border:1px solid #ffffff35;border-radius:999px;background:#07110df2;color:#fff;padding:10px 13px;font:850 10px/1 -apple-system,sans-serif;box-shadow:0 6px 22px #0008;min-height:38px';document.body.appendChild(b)}const active=teams.find(t=>String(t.team_id)===String(localTeam()))||teams.find(t=>String(t.team_id)===String(read().lastGridironTeam));b.textContent=teams.length>1?'🏈 '+(active?.team_name||'Gridiron Teams'):'🏈 '+(active?.team_name||'Team');b.onclick=picker}
function picker(){document.getElementById('bbsTeamPicker')?.remove();const w=document.createElement('div');w.id='bbsTeamPicker';w.style.cssText='position:fixed;inset:0;z-index:100400;background:#000a;display:grid;place-items:center;padding:18px;font-family:-apple-system,sans-serif';w.innerHTML='<div style="width:min(460px,100%);background:#fff;border-radius:18px;padding:18px;color:#13231b"><h2 style="margin:0 0 4px">Gridiron Teams</h2><div id="bbsTeamChoices"></div><button id="bbsAddGridironTeam" style="width:100%;padding:12px;margin:8px 0 2px">＋ Add Another Gridiron Team</button><button id="bbsTeamCancel" style="width:100%;margin-top:4px;border:0;background:transparent;padding:10px;text-decoration:underline">Cancel</button></div>';const box=w.querySelector('#bbsTeamChoices');teams.forEach(t=>{const x=document.createElement('button');x.style.cssText='width:100%;text-align:left;padding:12px;margin:5px 0';x.textContent=t.team_name;x.onclick=()=>{remember(t.team_id);resetForAuthoritativeLoad(t.team_id);sessionStorage.removeItem('bbs-gridiron-authoritative-load:'+uid+':'+t.team_id);location.reload()};box.appendChild(x)});w.querySelector('#bbsAddGridironTeam').onclick=setupAnother;w.querySelector('#bbsTeamCancel').onclick=()=>w.remove();document.body.appendChild(w)}
function addSports(){let b=document.getElementById('bbsMySportsGridiron');if(!b){b=document.createElement('button');b.id='bbsMySportsGridiron';b.type='button';b.style.cssText='position:fixed;right:10px;bottom:10px;z-index:9990;border:1px solid #55c77b;border-radius:999px;background:#07110df2;color:#fff;padding:10px 13px;font:850 10px/1 -apple-system,sans-serif;box-shadow:0 6px 22px #0008;min-height:38px';b.onclick=sports;document.body.appendChild(b)}b.innerHTML='<span style="font-size:13px">●</span> Bleacher Butt Stats · My Sports'}
async function init(){await recognize();window.addEventListener('online',recognize);if(sb?.auth?.onAuthStateChange)sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN')recognize();if(event==='SIGNED_OUT'||!session?.user)signedOutUi()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();