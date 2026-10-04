(function(){
  try{
    const params=new URLSearchParams(location.search);
    const token=params.get('teamInvite')||'';
    if(!token||!/^[a-z0-9_-]{32,}$/i.test(token)||/\/parent-viewer\.html$/i.test(location.pathname))return;
    // Legacy parent and account invitations originally shared the same query
    // parameter. Verify that the token is actually a public viewer invitation
    // before redirecting; coach invitations must remain in the account flow.
    fetch('https://eyuvgzhkhcpwtcbmsvct.supabase.co/rest/v1/rpc/get_public_team_viewer',{
      method:'POST',
      headers:{apikey:'sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l','Content-Type':'application/json'},
      body:JSON.stringify({p_token:token})
    }).then(response=>{
      if(!response.ok)return;
      const target=new URL('./parent-viewer.html',location.href);
      target.searchParams.set('teamInvite',token);
      const release=params.get('release');if(release)target.searchParams.set('release',release);
      location.replace(target.href);
    }).catch(()=>{});
  }catch(_){}
})();

// Per-team browser-cache isolation. sidelineStatsData remains the active working
// copy for backward compatibility; every cloud-linked team also receives a private
// snapshot keyed by cloud team id. Before a different team replaces the working
// copy, the outgoing team's exact state is archived.
(function(){
  const DATA_KEY='sidelineStatsData',RECOVERY_KEY='sidelineStatsRecovery';
  const TEAM_PREFIX='sidelineStatsData:team:',RECOVERY_PREFIX='sidelineStatsRecovery:team:';
  const ACTIVE_KEY='sidelineStatsActiveTeamId';
  const nativeSet=Storage.prototype.setItem,nativeGet=Storage.prototype.getItem;
  const parse=v=>{try{return JSON.parse(v)}catch(_){return null}};
  const teamId=s=>String(s?.cloud?.teamId||'').trim();
  function archiveRaw(raw){
    if(!raw)return false;
    const state=parse(raw),id=teamId(state);if(!id)return false;
    try{nativeSet.call(localStorage,TEAM_PREFIX+id,raw);nativeSet.call(localStorage,ACTIVE_KEY,id);return true}catch(_){return false}
  }
  try{archiveRaw(nativeGet.call(localStorage,DATA_KEY))}catch(_){}
  Storage.prototype.setItem=function(key,value){
    if(this===localStorage&&(key===DATA_KEY||key===RECOVERY_KEY)){
      try{
        const incoming=parse(String(value)),incomingId=teamId(incoming);
        if(key===DATA_KEY){
          const priorRaw=nativeGet.call(this,DATA_KEY),priorId=teamId(parse(priorRaw));
          if(priorId&&priorId!==incomingId)archiveRaw(priorRaw);
        }
        if(incomingId){
          nativeSet.call(this,(key===DATA_KEY?TEAM_PREFIX:RECOVERY_PREFIX)+incomingId,String(value));
          nativeSet.call(this,ACTIVE_KEY,incomingId);
        }
      }catch(_){}
    }
    return nativeSet.call(this,key,value);
  };
  window.SidelineTeamStorage={
    archiveCurrent(){try{return archiveRaw(nativeGet.call(localStorage,DATA_KEY))}catch(_){return false}},
    has(team){try{return !!nativeGet.call(localStorage,TEAM_PREFIX+String(team))}catch(_){return false}},
    restore(team){
      const id=String(team||'').trim();if(!id)return false;
      try{
        const raw=nativeGet.call(localStorage,TEAM_PREFIX+id),state=parse(raw);
        if(!raw||teamId(state)!==id)return false;
        nativeSet.call(localStorage,DATA_KEY,raw);
        const recovery=nativeGet.call(localStorage,RECOVERY_PREFIX+id);
        if(recovery)nativeSet.call(localStorage,RECOVERY_KEY,recovery);else localStorage.removeItem(RECOVERY_KEY);
        nativeSet.call(localStorage,ACTIVE_KEY,id);
        return true;
      }catch(_){return false}
    },
    clearWorkingCopy(){try{localStorage.removeItem(DATA_KEY);localStorage.removeItem(RECOVERY_KEY);return true}catch(_){return false}}
  };
})();

(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SidelineCommercialAccess=api})(typeof window!=='undefined'?window:globalThis,function(){
  function time(v){const n=v?Date.parse(v):NaN;return Number.isFinite(n)?n:null}
  function resolve(row,now=Date.now()){
    const source=String(row?.access_source||'standard'),complimentary=!!row?.complimentary||['founder_comp','internal_test'].includes(source),tier=['coach','pro'].includes(row?.tier)?'team_pro':String(row?.tier||'free');
    const ts=time(row?.trial_started_at),te=time(row?.trial_ends_at),ps=time(row?.paid_access_starts_at),pe=time(row?.paid_access_ends_at);
    const trial=tier==='trial'&&ts!==null&&te!==null&&ts<=now&&now<te,paid=['statkeeper','team_pro'].includes(tier)&&ps!==null&&ps<=now&&(pe===null||now<pe),active=complimentary||trial||paid;
    return {tier:complimentary?'team_pro':tier,status:complimentary?'complimentary':trial?'trial':paid?'active':row?.trial_used?'expired':'not_started',complimentary,active,coachAccess:active&&(complimentary||trial||tier==='team_pro'),recordAccess:active&&(complimentary||trial||['statkeeper','team_pro'].includes(tier)),daysRemaining:trial?Math.max(1,Math.ceil((te-now)/86400000)):null,trialEndsAt:row?.trial_ends_at||null};
  }
  function label(a){return a.status==='complimentary'?'Complimentary Team Pro':a.status==='trial'?`Team Pro trial • ${a.daysRemaining} day${a.daysRemaining===1?'':'s'} left`:a.active&&a.tier==='team_pro'?'Team Pro':a.active&&a.tier==='statkeeper'?'Statkeeper':a.status==='expired'?'Access expired':'Free Viewer'}
  return {resolve,label};
});

// Compatibility fix for older recorded play payloads: the live stat keeper stores
// first downs as "1st Down", while the original offense analytics helper only
// counted "First Down". Keep the analytics calculation tolerant of both formats.
(function(){
  const analytics=window.SidelineCoachAnalytics;
  if(!analytics||typeof analytics.render!=='function')return;
  const originalRender=analytics.render.bind(analytics);
  analytics.render=function(tab,ctx){
    const html=originalRender(tab,ctx);
    if(tab!=='offense'||!ctx)return html;
    const games=[...(ctx.games||[])];
    const selection=ctx.selection;
    const selected=!selection||selection==='season'?games:selection==='regular'?games.filter(g=>(g.gameType||'regular')==='regular'):selection==='playoff'?games.filter(g=>(g.gameType||'regular')==='playoff'):games.filter(g=>String(g.id)===String(selection).replace(/^game:/,''));
    const firstDowns=selected.flatMap(g=>g.plays||[]).filter(play=>{
      const possession=play?.stateBefore?.possession||(play?.type==='Rush'||play?.type==='Pass'?'ours':play?.type==='Defense'?'opp':null);
      if(possession!=='ours'||(play?.type!=='Rush'&&play?.type!=='Pass'))return false;
      const extras=Array.isArray(play?.extras)?play.extras:[];
      return play?.firstDown===true||extras.includes('First Down')||extras.includes('1st Down');
    }).length;
    return html.replace(/(<div class="coach-metric"><strong>)\d+(<\/strong><span>FIRST DOWNS •)/,`$1${firstDowns}$2`);
  };
})();
