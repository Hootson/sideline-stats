// Hardcourt cloud-persistence bootstrap.
// The approved live-game implementation remains intact in legacy-app.js.
const SUPABASE_URL='https://eyuvgzhkhcpwtcbmsvct.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l';
const AUTH_KEY='sb-eyuvgzhkhcpwtcbmsvct-hardcourt-auth-token';
const STATE_KEY='hardcourt-alpha';
const ACTIVE_TEAM_KEY='hardcourt-active-team-id';
const authOptions={auth:{storageKey:AUTH_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}};
const nativeSet=localStorage.setItem.bind(localStorage);
let bootstrapClient=null,bootstrapping=true,persistTimer=null,lastProfileSig='',lastRosterSig='',persisting=false,persistAgain=false,accountPromise=null;

function readLocal(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||'null')||{}}catch{return {}}}
function writeLocal(s){nativeSet(STATE_KEY,JSON.stringify(s))}
function pickContext(rows){if(!Array.isArray(rows)||!rows.length)return null;const remembered=localStorage.getItem(ACTIVE_TEAM_KEY);return rows.find(r=>String(r.teamId)===String(remembered))||rows[0]}
function mergeContext(local,ctx){
  const prior=Array.isArray(local.roster)?local.roster:[],byCloud=new Map(prior.filter(p=>p.cloudId).map(p=>[String(p.cloudId),p]));
  const roster=(ctx.players||[]).map((p,i)=>{const old=byCloud.get(String(p.id))||prior.find(x=>String(x.num)===String(p.jersey)&&String(x.name||'').toLowerCase()===String(p.name||'').toLowerCase());return{id:old?.id||`p${i}`,num:p.jersey??'',name:p.name||'Player',headshot:old?.headshot||'',cloudId:p.id}});
  const next={...local,cloudTeamId:ctx.teamId,cloudSeasonId:ctx.seasonId,team:ctx.teamName||local.team,grade:ctx.grade||local.grade||'',primary:ctx.primary||local.primary||'#111111',accent:ctx.accent||local.accent||'#39a852'};
  if(ctx.logo)next.teamLogo=ctx.logo;
  // Cloud roster is authoritative once it exists. An empty cloud roster is left
  // alone here so a first sign-in can safely migrate an existing local roster.
  if(roster.length){next.roster=roster;const ids=new Set(roster.map(p=>p.id));next.active=(next.active||[]).filter(id=>ids.has(id));if(next.active.length!==5)next.active=roster.slice(0,5).map(p=>p.id)}
  nativeSet(ACTIVE_TEAM_KEY,String(ctx.teamId));return next;
}
function applySyncedRoster(local,rows){
  const synced=Array.isArray(rows)?rows:[];
  local.roster=(local.roster||[]).map(p=>{const row=synced.find(r=>(p.cloudId&&String(r.id)===String(p.cloudId))||(String(r.jersey)===String(p.num)&&String(r.name||'').toLowerCase()===String(p.name||'').toLowerCase()));return row?{...p,cloudId:row.id}:p});
  return local;
}
async function ensureAccountContextInner(sb,user){
  if(!user)return false;let local=readLocal();
  const got=await sb.rpc('get_hardcourt_cloud_context');if(got.error){console.warn('Hardcourt account restore',got.error.message);return false}
  let contexts=Array.isArray(got.data)?got.data:[],ctx=pickContext(contexts);
  if(!ctx){
    // Re-check immediately before provisioning. This protects rapid auth events,
    // reloads, and multiple tabs from creating a second starter team.
    const verify=await sb.rpc('get_hardcourt_cloud_context');
    if(!verify.error){contexts=Array.isArray(verify.data)?verify.data:[];ctx=pickContext(contexts)}
    if(!ctx){
      const made=await sb.rpc('create_hardcourt_team',{p_name:local.team||'My Team',p_grade:local.grade||'5th Grade',p_primary:local.primary||'#111111',p_accent:local.accent||'#39a852'});
      if(made.error){
        // Another tab/session may have won the race. One final context read lets
        // us recover cleanly instead of presenting a broken first-login state.
        const recovery=await sb.rpc('get_hardcourt_cloud_context');
        if(recovery.error){console.warn('Hardcourt account create',made.error.message);return false}
        ctx=pickContext(recovery.data);
        if(!ctx){console.warn('Hardcourt account create',made.error.message);return false}
      }else{
        const again=await sb.rpc('get_hardcourt_cloud_context');if(again.error)return false;ctx=pickContext(again.data)
      }
    }
  }
  if(!ctx)return false;local=mergeContext(local,ctx);writeLocal(local);
  if(Array.isArray(local.roster)&&local.roster.length&&!(ctx.players||[]).length){const synced=await sb.rpc('sync_hardcourt_roster',{p_season_id:ctx.seasonId,p_players:local.roster.map(p=>({cloudId:p.cloudId||null,jersey:String(p.num||''),name:String(p.name||'Player')}))});if(!synced.error){local=applySyncedRoster(local,synced.data);writeLocal(local)}}
  return true;
}
async function ensureAccountContext(sb,user){
  if(accountPromise)return accountPromise;
  accountPromise=ensureAccountContextInner(sb,user);
  try{return await accountPromise}finally{accountPromise=null}
}
async function persistSnapshot(){
  if(persisting){persistAgain=true;return}persisting=true;
  try{
    if(!bootstrapClient)return;const session=(await bootstrapClient.auth.getSession()).data?.session;if(!session?.user)return;
    let s=readLocal();if(!s.cloudTeamId||!s.cloudSeasonId)return;
    const profileSig=JSON.stringify([s.cloudTeamId,s.team,s.grade,s.primary,s.accent,s.teamLogo||'']);
    if(profileSig!==lastProfileSig){const r=await bootstrapClient.rpc('update_hardcourt_team_profile',{p_team_id:s.cloudTeamId,p_name:s.team||'My Team',p_grade:s.grade||'',p_primary:s.primary||'#111111',p_accent:s.accent||'#39a852',p_logo_data:s.teamLogo||null});if(r.error)console.warn('Hardcourt team profile sync',r.error.message);else lastProfileSig=profileSig}
    const roster=Array.isArray(s.roster)?s.roster:[],rosterSig=JSON.stringify([s.cloudSeasonId,...roster.map(p=>[p.cloudId||'',String(p.num||''),p.name||''])]);
    if(rosterSig!==lastRosterSig){const r=await bootstrapClient.rpc('sync_hardcourt_roster',{p_season_id:s.cloudSeasonId,p_players:roster.map(p=>({cloudId:p.cloudId||null,jersey:String(p.num||''),name:String(p.name||'Player')}))});if(r.error)console.warn('Hardcourt roster persistence',r.error.message);else{s=applySyncedRoster(s,r.data);writeLocal(s);lastRosterSig=JSON.stringify([s.cloudSeasonId,...(s.roster||[]).map(p=>[p.cloudId||'',String(p.num||''),p.name||''])])}}
  }finally{persisting=false;if(persistAgain){persistAgain=false;schedulePersist()}}
}
function schedulePersist(){clearTimeout(persistTimer);persistTimer=setTimeout(()=>persistSnapshot().catch(e=>console.warn('Hardcourt persistence',e)),500)}
localStorage.setItem=function(key,value){nativeSet(key,value);if(!bootstrapping&&key===STATE_KEY)schedulePersist()};

if(window.supabase?.createClient){bootstrapClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,authOptions);const session=(await bootstrapClient.auth.getSession()).data?.session;if(session?.user)await ensureAccountContext(bootstrapClient,session.user)}
bootstrapping=false;
await import('./legacy-app.js');

if(bootstrapClient){bootstrapClient.auth.onAuthStateChange(async(event,session)=>{
  if(event==='SIGNED_IN'&&session?.user&&!sessionStorage.getItem('hc-account-hydrated')){sessionStorage.setItem('hc-account-hydrated','1');const changed=await ensureAccountContext(bootstrapClient,session.user);if(changed)location.reload()}
  if(event==='SIGNED_OUT')sessionStorage.removeItem('hc-account-hydrated');
})}
