// Shared Bleacher Butt Stats preferences: local-first with optional Supabase cloud sync.
const KEY='bbs-account-preferences';const defaults={lastEdition:null,lastHardcourtTeam:null,lastGridironTeam:null,launch:'chooser',updatedAt:0};let client=null,syncTimer=null;
export function readAccountPreferences(){try{return{...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return{...defaults}}}
function store(next){localStorage.setItem(KEY,JSON.stringify(next));return next}
function cloudPayload(p){return{p_last_edition:p.lastEdition||null,p_last_gridiron_team:p.lastGridironTeam||null,p_last_hardcourt_team:p.lastHardcourtTeam||null,p_launch:p.launch==='last'?'last':'chooser'}}
function scheduleCloud(){if(!client)return;clearTimeout(syncTimer);syncTimer=setTimeout(async()=>{try{const s=(await client.auth.getSession()).data?.session;if(!s?.user)return;await client.rpc('save_bbs_account_preferences',cloudPayload(readAccountPreferences()))}catch{}},250)}
export function bindAccountPreferencesClient(sb){client=sb||null;return client}
export async function hydrateAccountPreferences(sb=client){if(sb)client=sb;if(!client)return readAccountPreferences();try{const s=(await client.auth.getSession()).data?.session;if(!s?.user)return readAccountPreferences();const r=await client.rpc('get_bbs_account_preferences');const row=Array.isArray(r.data)?r.data[0]:r.data,local=readAccountPreferences();if(!row){scheduleCloud();return local}const remote={lastEdition:row.last_edition||null,lastGridironTeam:row.last_gridiron_team||null,lastHardcourtTeam:row.last_hardcourt_team||null,launch:row.launch==='last'?'last':'chooser',updatedAt:new Date(row.updated_at||0).getTime()||0};if(remote.updatedAt>Number(local.updatedAt||0)){store({...defaults,...local,...remote});return readAccountPreferences()}scheduleCloud();return local}catch{return readAccountPreferences()}}
export function updateAccountPreferences(patch={}){const next=store({...readAccountPreferences(),...patch,updatedAt:Date.now()});scheduleCloud();return next}
export function rememberEdition(id){return updateAccountPreferences({lastEdition:id||null})}
export function rememberHardcourtTeam(id){return updateAccountPreferences({lastHardcourtTeam:id||null,lastEdition:'hardcourt'})}
export function rememberGridironTeam(id){return updateAccountPreferences({lastGridironTeam:id||null,lastEdition:'gridiron'})}
export function setLaunchBehavior(launch){return updateAccountPreferences({launch:launch==='last'?'last':'chooser'})}
export function shouldShowChooser({ownedCount=0,forced=false}={}){const p=readAccountPreferences();if(forced)return true;if(ownedCount>1)return p.launch!=='last';return ownedCount!==1}
export function preferredEdition(owned=[]){const p=readAccountPreferences(),list=[...new Set((owned||[]).filter(Boolean))];if(!list.length)return null;if(list.length===1)return list[0];return p.launch==='last'&&list.includes(p.lastEdition)?p.lastEdition:null}
