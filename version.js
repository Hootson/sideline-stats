window.SIDELINE_STATS_VERSION="4.6.39";

// Cloud-logo safety guard.
// Safari can fall back to a compact local snapshot when device storage is tight.
// That compact snapshot intentionally drops cached base64 images. Missing cached
// images must never be interpreted as an intentional request to delete the cloud logo.
(()=>{
  const TEAM_REMOVE_KEY='sidelineExplicitTeamLogoRemove';
  const OPP_REMOVE_KEY='sidelineExplicitOpponentLogoRemove';
  const setFlag=(key,value)=>{try{if(value)sessionStorage.setItem(key,'1');else sessionStorage.removeItem(key)}catch(_){}};
  const hasFlag=key=>{try{return sessionStorage.getItem(key)==='1'}catch(_){return false}};

  document.addEventListener('click',e=>{
    const id=e.target?.closest?.('button')?.id||e.target?.id||'';
    if(id==='removeLogoBtn')setFlag(TEAM_REMOVE_KEY,true);
    if(id==='removeOpponentLogoBtn')setFlag(OPP_REMOVE_KEY,true);
  },true);
  document.addEventListener('change',e=>{
    const id=e.target?.id||'';
    if(id==='teamLogoInput'&&e.target?.files?.length)setFlag(TEAM_REMOVE_KEY,false);
    if((id==='editOpponentLogo'||id==='newOpponentLogo')&&e.target?.files?.length)setFlag(OPP_REMOVE_KEY,false);
  },true);

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    let url='';
    try{url=typeof input==='string'?input:(input?.url||'')}catch(_){ }
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    const isWrite=method==='PATCH'||method==='POST'||method==='PUT';
    let nextInit=init,teamRemovalAllowed=false,oppRemovalAllowed=false;
    if(isWrite&&url.includes('/rest/v1/')&&typeof init?.body==='string'){
      try{
        const body=JSON.parse(init.body);let changed=false;
        if(url.includes('/rest/v1/teams')&&body&&body.logo_data===null){
          teamRemovalAllowed=hasFlag(TEAM_REMOVE_KEY);
          if(!teamRemovalAllowed){delete body.logo_data;changed=true}
        }
        if(url.includes('/rest/v1/games')&&body&&body.opponent_logo_data===null){
          oppRemovalAllowed=hasFlag(OPP_REMOVE_KEY);
          if(!oppRemovalAllowed){delete body.opponent_logo_data;changed=true}
        }
        // Repair legacy defensive-return touchdown payloads before they reach Supabase.
        const raw=body?.p_event_data?.raw||body?.event_data?.raw||null;
        const defensiveReturnTd=String(body?.p_play_type||body?.play_type||raw?.type||'')==='Defense'&&!!raw?.defensiveTouchdownPlayerId;
        if(defensiveReturnTd){
          if('p_opponent_points' in body){body.p_opponent_points=0;changed=true}
          if('opponent_points' in body){body.opponent_points=0;changed=true}
          if(body.p_state_before&&body.p_state_after){body.p_state_after.opponent_score=Number(body.p_state_before.opponent_score||0);changed=true}
          if(body.state_before&&body.state_after){body.state_after.opponent_score=Number(body.state_before.opponent_score||0);changed=true}
        }
        if(changed)nextInit={...init,body:JSON.stringify(body)};
      }catch(_){ }
    }
    const response=await nativeFetch(input,nextInit);
    if(response?.ok){
      if(teamRemovalAllowed)setFlag(TEAM_REMOVE_KEY,false);
      if(oppRemovalAllowed)setFlag(OPP_REMOVE_KEY,false);
    }
    return response;
  };
})();
