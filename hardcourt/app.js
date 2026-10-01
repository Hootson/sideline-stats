import './legacy-app.js';
import {runHardcourtAccountGate} from './account-gate.js';
import {createHardcourtAccountIntegration} from './account-integration.js';
import {runHardcourtOnboarding} from './onboarding.js';
import {createHardcourtCommerce} from './commerce.js';

const SUPABASE_URL='https://eyuvgzhkhcpwtcbmsvct.supabase.co';
const SUPABASE_KEY='sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l';
const STORAGE_KEY='hardcourt-v1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readLocal=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}};
const writeLocal=s=>localStorage.setItem(STORAGE_KEY,JSON.stringify(s||{}));

async function client(){
  if(!window.supabase?.createClient){
    await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(m=>window.__hcSupabase=m);
  }
  const createClient=window.supabase?.createClient||window.__hcSupabase?.createClient;
  return createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
}

function showFatal(error){
  console.error('[Hardcourt bootstrap]',error);
  const d=document.createElement('div');d.style='position:fixed;inset:0;z-index:100001;background:#07110d;color:white;padding:32px;font:16px system-ui';d.innerHTML='<div style="max-width:560px;margin:auto"><h2>Hardcourt could not finish loading</h2><p>'+esc(error?.message||error)+'</p><button onclick="location.reload()" style="padding:12px 18px">Try Again</button></div>';document.body.appendChild(d);
}

async function boot(){
  const sb=await client();
  const {data:{user}}=await sb.auth.getUser();
  if(!user){await runHardcourtAccountGate(sb);return}
  const integration=createHardcourtAccountIntegration({sb,getUser:()=>user,getState:readLocal,onTeamChanged:team=>{const s=readLocal();s.cloudTeamId=team.teamId;s.cloudSeasonId=team.seasonId;writeLocal(s)},escapeHtml:esc});
  let account=await integration.refresh();
  if(account.status==='needs_team'){
    const result=await integration.createTeam({name:'My Hardcourt Team',grade:'',primary:'#111111',accent:'#39a852'});
    const s=readLocal();s.hardcourtNeedsTeamSetup=true;writeLocal(s);account=result;
  }
  await runHardcourtOnboarding(sb,{readLocal,writeLocal});
  const commerce=createHardcourtCommerce({sb,getState:readLocal,writeState:writeLocal,escapeHtml:esc});
  await commerce.refresh();
  commerce.installAccountBar({email:user.email||'',teams:integration.getTeams(),onTeamChange:async id=>{await integration.switchTeam(id);location.reload()}});
  commerce.handleCheckoutReturn();
  window.HardcourtAccount={sb,user,integration,commerce};
  document.documentElement.dataset.hardcourtAccount='ready';
}

sleep(0).then(boot).catch(showFatal);
