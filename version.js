window.SIDELINE_STATS_VERSION="4.6.85";

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
    // The historical bulk uploader remains quarantined. Permit only verified,
    // narrowly scoped writes issued by the new-game synchronization worker.
    function allowedGuardedWrite(){
      const grant=window.SidelineSafeWriteGrant;
      if(!grant||!grant.active||Date.now()-grant.startedAt>120000)return false;
      let parsed,body={};
      try{parsed=new URL(url,location.href);body=init?.body?JSON.parse(init.body):{}}
      catch(_){return false}
      if(parsed.origin!=='https://eyuvgzhkhcpwtcbmsvct.supabase.co')return false;
      const segments=parsed.pathname.split('/');
      const table=segments.length===4&&segments[1]==='rest'&&segments[2]==='v1'?segments[3]:null;
      if(!table)return false;
      const rows=Array.isArray(body)?body:[body];
      if(!rows.length)return false;
      const param=key=>{const value=parsed.searchParams.get(key)||'';return value.startsWith('eq.')?value.slice(3):null};
      const eqId=param('id');
      if(table==='games'){
        if(method==='POST')return !grant.gameId&&rows.length===1&&
          rows[0].season_id===grant.seasonId&&rows[0].opponent_name===grant.opponent&&
          Number(rows[0].week_number)===grant.week&&rows[0].status==='live';
        if(method==='PATCH')return !!grant.gameId&&eqId===grant.gameId&&
          rows.length===1&&body.status!=='archived'&&body.deleted_at===undefined;
        return false;
      }
      if(table==='players'){
        if(method!=='POST')return false;
        return rows.every(r=>r.season_id===grant.seasonId&&r.active===true
          &&grant.rosterRows?.has(String(r.jersey_number)+'::'+String(r.name)));
      }
      if(!grant.gameId)return false;
      if(table==='plays'){
        if(method==='POST')return rows.every(r=>r.game_id===grant.gameId&&grant.playIds.has(r.id)&&
          Number.isInteger(Number(r.sequence))&&Number(r.sequence)>0);
        if(method==='PATCH'){
          // A new-game tombstone may only target the explicitly verified play,
          // game and revision. No generic deletions or historical writes.
          if(body.deleted_at!==undefined)
            return !!eqId&&grant.playDeleteIds?.has(eqId)&&param('game_id')===grant.gameId&&
              Number.isInteger(Number(param('revision')))&&Number(param('revision'))>0&&
              Object.keys(body).sort().join(',')==='deleted_at,revision'&&
              typeof body.deleted_at==='string'&&!Number.isNaN(Date.parse(body.deleted_at))&&
              Number(body.revision)===Number(param('revision'))+1&&
              parsed.searchParams.get('deleted_at')==='is.null';
          return !!eqId&&grant.playIds.has(eqId)&&body.deleted_at===undefined;
        }
        return false;
      }
      if(table==='play_credits'){
        if(method==='POST')return rows.every(r=>grant.playIds.has(r.play_id)&&r.player_id&&r.credit_type);
        if(method==='PATCH')return !!eqId&&grant.creditIds.has(eqId);
        return false;
      }
      if(table==='penalties'){
        if(method==='POST')return rows.every(r=>r.game_id===grant.gameId&&grant.playIds.has(r.play_id));
        if(method==='PATCH')return !!eqId&&grant.penaltyIds.has(eqId);
        return false;
      }
      if(table==='snap_events'){
        if(method==='POST')return rows.every(r=>r.game_id===grant.gameId&&grant.snapIds.has(r.id));
        if(method==='PATCH')return !!eqId&&grant.snapIds.has(eqId)&&body.game_id===undefined;
        return false;
      }
      if(table==='snap_participants'){
        if(method==='POST')return rows.every(r=>grant.snapIds.has(r.snap_event_id)&&r.player_id);
        // Deleting participant associations remains blocked until separately reviewed.
        return false;
      }
      return false;
    }
    // Only the current, verified game may request a Snap Tracker invite.
    // All other RPCs and legacy writes remain quarantined.
    function allowedSnapInviteRpc(){
      if(method!=='POST'||typeof init?.body!=='string')return false;
      const grant=window.SidelineSnapInviteWriteGrant;
      if(!grant||!grant.active||Date.now()-grant.startedAt>15000)return false;
      try{
        const target=new URL(url,location.href);
        if(target.origin!=='https://eyuvgzhkhcpwtcbmsvct.supabase.co'||
           target.pathname!=='/rest/v1/rpc/create_snap_tracker_invite'||
           target.search)return false;
        const body=JSON.parse(init.body);
        if(!body||Array.isArray(body)||
           Object.keys(body).sort().join(',')!=='p_expires_hours,p_game_id'||
           body.p_game_id!==grant.gameId||body.p_expires_hours!==48)return false;
        // Consume permission at first use so it cannot authorize a second call.
        grant.active=false;
        return true;
      }catch(_){return false}
    }
    if(url.includes('/rest/v1/')&&['POST','PUT','PATCH','DELETE'].includes(method)&&!allowedSnapInviteRpc()&&!allowedGuardedWrite()){
      console.warn('Cloud REST write blocked during safe rollback',method,url.split('?')[0]);
      return new Response(JSON.stringify({message:'Historical sync quarantined. Only guarded new-game uploads allowed.'}),{status:503,headers:{'Content-Type':'application/json'}});
    }
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
