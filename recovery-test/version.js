window.SIDELINE_STATS_VERSION="4.6.41";

// Cloud/logo/score safety repairs.
(()=>{
  const DATA_KEY='sidelineStatsData';
  const RECOVERY_KEY='sidelineStatsRecovery';
  const TEAM_REMOVE_KEY='sidelineExplicitTeamLogoRemove';
  const OPP_REMOVE_KEY='sidelineExplicitOpponentLogoRemove';
  const setFlag=(key,value)=>{try{if(value)sessionStorage.setItem(key,'1');else sessionStorage.removeItem(key)}catch(_){}};
  const hasFlag=key=>{try{return sessionStorage.getItem(key)==='1'}catch(_){return false}};

  // Older builds accidentally added six opponent points when OUR defense returned
  // an interception/fumble for a touchdown. Repair each newly-seen legacy event once.
  function repairDefensiveReturnScores(state){
    if(!state||!Array.isArray(state.games))return false;
    let changed=false;
    for(const g of state.games){
      const count=(g?.plays||[]).filter(p=>p?.type==='Defense'&&p?.defensiveTouchdownPlayerId&&Array.isArray(p.extras)&&p.extras.includes('TD')).length;
      const prior=Math.max(0,Number(g?.defensiveReturnScoreRepairCount||0));
      if(count>prior){
        const delta=count-prior;
        g.oppScore=Math.max(0,Number(g.oppScore||0)-(delta*6));
        g.defensiveReturnScoreRepairCount=count;
        changed=true;
      }else if(count&&g.defensiveReturnScoreRepairCount!==count){
        g.defensiveReturnScoreRepairCount=count;changed=true;
      }
    }
    return changed;
  }
  function repairStoredState(key){
    try{
      const raw=localStorage.getItem(key);if(!raw)return;
      const state=JSON.parse(raw);
      if(repairDefensiveReturnScores(state))localStorage.setItem(key,JSON.stringify(state));
    }catch(_){ }
  }
  repairStoredState(DATA_KEY);
  repairStoredState(RECOVERY_KEY);

  // If Safari storage gets tight, the app intentionally saves a compact snapshot
  // without cached base64 images. Missing local images must never erase cloud logos.
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

  function repairedLocalOpponentScoreForCloudGame(url){
    try{
      const m=String(url).match(/[?&]id=eq\.([0-9a-f-]{36})/i);if(!m)return null;
      const state=JSON.parse(localStorage.getItem(DATA_KEY)||'null');if(!state)return null;
      repairDefensiveReturnScores(state);
      const cloudId=m[1],pairs=Object.entries(state.cloud?.gameIds||{}),localId=(pairs.find(([,v])=>String(v)===cloudId)||[])[0];
      const game=(state.games||[]).find(g=>String(g.id)===String(localId));
      return game?Math.max(0,Number(game.oppScore||0)):null;
    }catch(_){return null}
  }

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
        // Keep game score sync from re-introducing the legacy +6 opponent error.
        if(url.includes('/rest/v1/games')&&method==='PATCH'){
          const repaired=repairedLocalOpponentScoreForCloudGame(url);
          if(repaired!==null&&'opponent_score' in body){body.opponent_score=repaired;changed=true}
          if(repaired!==null&&body.current_state&&typeof body.current_state==='object'){body.current_state.opponent_score=repaired;changed=true}
        }
        // Repair defensive-return touchdown play payloads before they reach Supabase.
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

  // Edit Game Details guard: the legacy button handler receives the click Event as
  // its "game" argument, which makes Week fall back to 1 and can blank fields.
  // Snapshot the already-rendered active game before that handler runs, then restore
  // those values immediately after it opens the editor. Editing only a logo will no
  // longer change team name, opponent, week, location, or game type.
  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#editGameBtn');if(!btn)return;
    const team=(document.getElementById('teamGame')?.textContent||'').trim();
    const opponent=(document.getElementById('oppGame')?.textContent||'').trim();
    const date=(document.getElementById('gameDate')?.textContent||'').trim();
    const week=(date.match(/Week\s+(\d+)/i)||[])[1]||'';
    const location=(document.getElementById('gameLocation')?.textContent||'').trim();
    const typeText=(document.getElementById('gameTypeText')?.textContent||'').trim().toLowerCase();
    const gameType=typeText.includes('playoff')?'playoff':'regular';
    setTimeout(()=>{
      const teamInput=document.getElementById('editTeamName');if(teamInput&&team)teamInput.value=team;
      const oppInput=document.getElementById('editOpponent');if(oppInput&&opponent)oppInput.value=opponent;
      const weekInput=document.getElementById('editGameWeek');if(weekInput&&week)weekInput.value=week;
      const locInput=document.getElementById('editLocation');if(locInput&&location&&[...locInput.options].some(o=>o.value===location||o.text===location))locInput.value=[...locInput.options].find(o=>o.value===location||o.text===location)?.value||locInput.value;
      const typeInput=document.getElementById('editGameType');if(typeInput)typeInput.value=gameType;
    },0);
  },true);
  document.addEventListener('click',e=>{
    if(!e.target?.closest?.('#saveGameDetailsBtn'))return;
    const teamInput=document.getElementById('editTeamName');
    if(teamInput&&!teamInput.value.trim())teamInput.value=(document.getElementById('teamGame')?.textContent||'').trim();
    const weekInput=document.getElementById('editGameWeek');
    if(weekInput&&!Number(weekInput.value)){
      const date=document.getElementById('gameDate')?.textContent||'';
      const week=(date.match(/Week\s+(\d+)/i)||[])[1];if(week)weekInput.value=week;
    }
  },true);

  // Parent Viewer: convert large base64 logos to Blob URLs before Safari paints them.
  // This is much more reliable on iPhone than repeatedly assigning large data URLs.
  const logoBlobCache=new Map();
  function blobUrlForDataUrl(src){
    if(!src?.startsWith?.('data:image/'))return src;
    if(logoBlobCache.has(src))return logoBlobCache.get(src);
    try{
      const comma=src.indexOf(',');if(comma<0)return src;
      const meta=src.slice(0,comma),payload=src.slice(comma+1),mime=(meta.match(/^data:([^;,]+)/)||[])[1]||'image/jpeg';
      let bytes;
      if(/;base64/i.test(meta)){
        const bin=atob(payload);bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
      }else bytes=new TextEncoder().encode(decodeURIComponent(payload));
      const url=URL.createObjectURL(new Blob([bytes],{type:mime}));logoBlobCache.set(src,url);return url;
    }catch(_){return src}
  }
  function normalizeViewerLogo(img){
    if(!img||!['teamLogo','oppLogo'].includes(img.id))return;
    const src=img.getAttribute('src')||'';
    if(src.startsWith('data:image/'))img.src=blobUrlForDataUrl(src);
    img.onerror=()=>{img.classList.add('hidden');};
  }
  const normalizeAllViewerLogos=()=>{normalizeViewerLogo(document.getElementById('teamLogo'));normalizeViewerLogo(document.getElementById('oppLogo'));};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',normalizeAllViewerLogos);else normalizeAllViewerLogos();
  new MutationObserver(ms=>{for(const m of ms)if(m.type==='attributes'&&m.attributeName==='src')normalizeViewerLogo(m.target)}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['src']});
})();
