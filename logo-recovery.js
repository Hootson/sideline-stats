(function(root,factory){
  const api=factory(root);
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.SidelineLogoRecovery=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(root){
  "use strict";
  // Images live outside the quota-constrained game snapshot. No game records
  // or statistics are ever written by this module.
  const DB_NAME="bleacher-butt-gridiron-images-v1",STORE="logos";
  let openPromise=null;
  const cachedValues=new Map();
  const isImage=value=>typeof value==="string"&&/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(value);
  const cloudUuid=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value||""));
  const key=(teamId,kind,id)=>teamId+":"+kind+":"+id;
  function database(){
    if(openPromise)return openPromise;
    if(!root.indexedDB)return Promise.resolve(null);
    openPromise=new Promise(resolve=>{
      try{
        const req=root.indexedDB.open(DB_NAME,1);
        req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>resolve(null);
        req.onblocked=()=>resolve(null);
      }catch(_){resolve(null)}
    });
    return openPromise;
  }
  async function cacheRead(name){
    const db=await database();if(!db)return null;
    return new Promise(resolve=>{
      try{
        const request=db.transaction(STORE,"readonly").objectStore(STORE).get(name);
        request.onsuccess=()=>{const value=request.result;if(isImage(value))cachedValues.set(name,value);resolve(isImage(value)?value:null)};
        request.onerror=()=>resolve(null);
      }catch(_){resolve(null)}
    });
  }
  async function cacheWrite(name,data){
    if(!isImage(data))return false;
    const db=await database();if(!db)return false;
    return new Promise(resolve=>{
      try{
        const transaction=db.transaction(STORE,"readwrite");
        transaction.objectStore(STORE).put(data,name);
        transaction.oncomplete=()=>{cachedValues.set(name,data);resolve(true)};
        transaction.onerror=()=>resolve(false);
        transaction.onabort=()=>resolve(false);
      }catch(_){resolve(false)}
    });
  }
  function snapshotWithoutCachedImages(state,teamId){
    if(!teamId||!state||!Array.isArray(state.games))return state;
    let team=state.team,games=state.games,changed=false;
    if(isImage(team?.logoData)&&cachedValues.get(key(teamId,"team",teamId))===team.logoData){
      team={...team,logoData:null};changed=true;
    }
    for(let i=0;i<games.length;i++){
      const game=games[i],id=String(state.cloud?.gameIds?.[game.id]||game.id);
      if(!isImage(game.opponentLogoData)||
        cachedValues.get(key(teamId,"game",id))!==game.opponentLogoData)continue;
      if(games===state.games)games=[...games];
      games[i]={...game,opponentLogoData:null};changed=true;
    }
    return changed?{...state,team,games}:state;
  }
  async function restore(options){
    const {client,getState,teamId,seasonId,onChange,shouldRestoreTeam,shouldRestoreOpponent}=options||{};
    if(!teamId||!seasonId||typeof getState!=="function")return {cached:0,downloaded:0};
    const current=()=>{
      const s=getState();
      return String(s?.cloud?.teamId||"")===String(teamId)&&
        String(s?.cloud?.seasonId||"")===String(seasonId)?s:null;
    };
    const canTeam=()=>typeof shouldRestoreTeam!=="function"||shouldRestoreTeam();
    const canOpponent=()=>typeof shouldRestoreOpponent!=="function"||shouldRestoreOpponent();
    const gameId=(s,g)=>String(s?.cloud?.gameIds?.[g.id]||g.id);
    const findGame=id=>{
      const s=current();return s?.games?.find(g=>gameId(s,g)===id)||null;
    };
    const notify=()=>{try{onChange?.()}catch(error){console.warn("Logo display refresh skipped",error)}};
    let cached=0,downloaded=0,dirty=false;
    let s=current();if(!s)return {cached,downloaded};
    const teamCacheKey=key(teamId,"team",teamId);
    if(isImage(s.team?.logoData)){
      void cacheWrite(teamCacheKey,s.team.logoData);
    }else if(canTeam()){
      const value=await cacheRead(teamCacheKey);s=current();
      if(s?.team&&!isImage(s.team.logoData)&&canTeam()&&isImage(value)){
        s.team.logoData=value;cached++;dirty=true;
      }
    }
    s=current();if(!s)return {cached,downloaded};
    for(const g of s.games||[]){
      const id=gameId(s,g),cacheKey=key(teamId,"game",id);
      if(isImage(g.opponentLogoData)){void cacheWrite(cacheKey,g.opponentLogoData);continue}
      if(!canOpponent())continue;
      const value=await cacheRead(cacheKey);
      const live=findGame(id);
      if(live&&!isImage(live.opponentLogoData)&&canOpponent()&&isImage(value)){
        live.opponentLogoData=value;cached++;dirty=true;
      }
    }
    if(dirty){notify();dirty=false}
    // Refill only still-missing images, through SELECT requests. This must
    // never invoke the historical bulk-sync or replace a local game snapshot.
    if(!client||options.online===false||!current())return {cached,downloaded};
    s=current();
    if(canTeam()&&!isImage(s.team?.logoData)){
      try{
        const {data,error}=await client.from("teams").select("id,logo_data").eq("id",teamId).single();
        if(error)throw error;
        s=current();
        if(s?.team&&canTeam()&&!isImage(s.team.logoData)&&isImage(data?.logo_data)){
          s.team.logoData=data.logo_data;downloaded++;dirty=true;
          void cacheWrite(teamCacheKey,data.logo_data);
        }
      }catch(error){console.warn("Team logo recovery unavailable",error)}
    }
    s=current();if(!s){if(dirty)notify();return {cached,downloaded}}
    const missing=canOpponent()?(s.games||[]).filter(g=>!isImage(g.opponentLogoData))
      .map(g=>gameId(s,g)).filter(cloudUuid):[];
    const ids=[...new Set(missing)];
    // Small batches cap peak network and memory use on iOS.
    for(let start=0;start<ids.length;start+=4){
      if(!current()||!canOpponent())break;
      const batch=ids.slice(start,start+4);
      try{
        const {data,error}=await client.from("games")
          .select("id,opponent_logo_data").eq("season_id",seasonId).in("id",batch);
        if(error)throw error;
        for(const row of data||[]){
          const id=String(row.id),live=findGame(id);
          if(!live||!canOpponent()||isImage(live.opponentLogoData)||!isImage(row.opponent_logo_data))continue;
          live.opponentLogoData=row.opponent_logo_data;downloaded++;dirty=true;
          void cacheWrite(key(teamId,"game",id),row.opponent_logo_data);
        }
        if(dirty){notify();dirty=false}
      }catch(error){console.warn("Opponent logo recovery unavailable",error)}
    }
    if(dirty)notify();
    return {cached,downloaded};
  }
  return {restore,cacheRead,cacheWrite,snapshotWithoutCachedImages};
});
