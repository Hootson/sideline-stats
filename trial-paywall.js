(function(){
  const SUPABASE_URL="https://eyuvgzhkhcpwtcbmsvct.supabase.co";
  const SUPABASE_KEY="sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l";
  const AUTH_KEY="sb-eyuvgzhkhcpwtcbmsvct-auth-token";
  let sb=null,checking=false;
  const $=s=>document.querySelector(s);
  function access(row){return window.SidelineCommercialAccess?.resolve(row)||{active:false,status:'not_started'};}
  function hide(){document.getElementById('productionAccessGate')?.remove();}
  function show(){
    if(document.getElementById('productionAccessGate'))return;
    const el=document.createElement('div');el.id='productionAccessGate';el.style.cssText='position:fixed;inset:0;z-index:100000;background:#f4f6f5;display:flex;align-items:center;justify-content:center;padding:22px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif';
    el.innerHTML='<div style="width:min(520px,100%);background:white;border-radius:22px;padding:28px;box-shadow:0 18px 55px #0002;text-align:center"><div style="font-weight:900;letter-spacing:.08em;color:#177b46">BLEACHER BUTT STATS</div><h1 style="font-size:27px;margin:12px 0 8px">Your 7-day trial has ended</h1><p style="color:#5e6862;line-height:1.45">Your team, roster, games and stats are still saved. Choose a season plan to keep statkeeping and team features active.</p><button id="expiredChoosePlan" style="width:100%;border:0;border-radius:12px;background:#177b46;color:white;font-size:17px;font-weight:800;padding:15px;margin-top:12px">Choose a Plan</button><button id="expiredSignOut" style="width:100%;border:1px solid #ccd4cf;border-radius:12px;background:white;color:#26322b;font-size:15px;font-weight:700;padding:13px;margin-top:9px">Sign Out</button><div id="expiredGateMessage" style="font-size:13px;color:#6c756f;margin-top:12px">No data is deleted when a trial expires.</div></div>';
    document.body.appendChild(el);
    $('#expiredChoosePlan').onclick=()=>{hide();document.getElementById('viewPlansBtn')?.click();if(document.getElementById('plansModal')?.classList.contains('hidden'))document.getElementById('cloudAccountBtn')?.click();setTimeout(()=>document.getElementById('viewPlansBtn')?.click(),50)};
    $('#expiredSignOut').onclick=async()=>{try{await sb?.auth.signOut({scope:'local'})}finally{location.reload()}};
  }
  async function getClient(){if(sb)return sb;if(!window.supabase?.createClient)return null;sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return sb;}
  async function evaluate(){
    if(checking)return;checking=true;
    try{
      const client=await getClient();if(!client)return;
      const {data:{session}}=await client.auth.getSession();if(!session?.user){hide();return;}
      const {data:teams,error}=await client.from('teams').select('id,owner_user_id,created_at').eq('owner_user_id',session.user.id).order('created_at',{ascending:true});if(error||!teams?.length){hide();return;}
      const remembered=Object.keys(localStorage).find(k=>k.startsWith('sidelineStatsLastTeam:'))?localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('sidelineStatsLastTeam:'))):null;
      const team=teams.find(t=>t.id===remembered)||teams[0];
      let {data:row,error:entError}=await client.from('team_entitlements').select('tier,trial_used,trial_started_at,trial_ends_at,paid_access_starts_at,paid_access_ends_at,access_source,complimentary').eq('team_id',team.id).maybeSingle();
      if(entError)return;
      if(!row){
        const {error:startError}=await client.rpc('start_gridiron_team_trial',{p_team_id:team.id});
        if(startError){console.warn('Could not start Gridiron trial',startError.message);return;}
        const q=await client.from('team_entitlements').select('tier,trial_used,trial_started_at,trial_ends_at,paid_access_starts_at,paid_access_ends_at,access_source,complimentary').eq('team_id',team.id).maybeSingle();row=q.data;
      }
      const a=access(row);if(a.active||a.complimentary||a.status==='not_started')hide();else if(a.status==='expired')show();
    }catch(e){console.warn('Production access check skipped',e)}finally{checking=false}
  }
  window.addEventListener('load',()=>setTimeout(evaluate,900));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(evaluate,100)});
  window.addEventListener('focus',()=>setTimeout(evaluate,100));
})();
