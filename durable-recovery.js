/* Local-only durable backup for quota-constrained iOS Gridiron recovery.
 * IndexedDB is used only after explicit verified game recovery.
 * Preserves the old primary + recovery before any localStorage reclamation. */
(function(root,factory){
  const api=factory(root);
  root.SidelineDurableRecovery=api;
  if(typeof module==="object"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(root){
  "use strict";
  const NAME="bleacher-butt-gridiron-durable-v1",STORE="snapshots",VERSION=1;
  const MAIN_KEY="sidelineStatsData",RECOVERY_KEY="sidelineStatsRecovery";
  let dbPromise=null,active=false,queue=Promise.resolve();
  function hash(s){
    let h=2166136261;
    for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);
    return (h>>>0).toString(16).padStart(8,"0")+":"+s.length;
  }
  function open(){
    if(dbPromise)return dbPromise;
    if(!root.indexedDB)return Promise.reject(Error("IndexedDB is unavailable on this device."));
    dbPromise=new Promise((resolve,reject)=>{
      let request;
      try{request=root.indexedDB.open(NAME,VERSION)}catch(e){reject(e);return}
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||Error("Durable backup database could not open."));
      request.onblocked=()=>reject(Error("Another tab is blocking the durable backup database."));
    }).catch(err=>{dbPromise=null;throw err});
    return dbPromise;
  }
  async function putMany(records){
    const db=await open();
    return new Promise((resolve,reject)=>{
      let tx;
      try{
        tx=db.transaction(STORE,"readwrite");
        const store=tx.objectStore(STORE);
        for(const [key,value] of records)store.put(value,key);
      }catch(e){reject(e);return}
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>reject(tx.error||Error("Durable snapshot write failed."));
      tx.onabort=()=>reject(tx.error||Error("Durable snapshot transaction aborted."));
    });
  }
  async function get(key){
    const db=await open();
    return new Promise((resolve,reject)=>{
      let req;
      try{req=db.transaction(STORE,"readonly").objectStore(STORE).get(key)}
      catch(e){reject(e);return}
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error||Error("Durable snapshot read failed."));
    });
  }
  function entry(raw){
    if(typeof raw!=="string")return {present:false};
    return {present:true,raw,hash:hash(raw)};
  }
  function verify(e){
    if(!e?.present)return null;
    if(typeof e.raw!=="string"||hash(e.raw)!==e.hash)
      throw Error("Stored recovery checksum failed.");
    return e.raw;
  }
  function validate(s,gameId){
    if(!s?.team?.name||!Array.isArray(s.roster)||!Array.isArray(s.games))
      throw Error("Recovered state is invalid.");
    let g=s.games.find(x=>x.id===gameId);
    if(!g){
      const marker=Object.values(s.cloud?.removedFromDevice||{})
        .find(x=>x?.localId===gameId&&x?.seasonId===s.cloud?.seasonId);
      if(marker)g={plays:[],snapRecords:[]};
    }
    if(!g||!Array.isArray(g.plays)||!Array.isArray(g.snapRecords))
      throw Error("Recovered game is missing.");
    if(new Set(g.plays.map(p=>p.id)).size!==g.plays.length)
      throw Error("Duplicate recovered play IDs.");
    if(new Set(g.snapRecords.map(p=>p.id)).size!==g.snapRecords.length)
      throw Error("Duplicate recovered snap IDs.");
    return g;
  }
  // Atomic transaction stores the OLD primary, OLD safety copy and new data
  // together. We never delete anything from localStorage until readback verifies.
  async function stage(state,gameId){
    const g=validate(state,gameId);
    const raw=JSON.stringify(state),written=Date.now();
    const oldPrimary=entry(root.localStorage.getItem(MAIN_KEY));
    const oldRecovery=entry(root.localStorage.getItem(RECOVERY_KEY));
    const recovered=entry(raw);
    await putMany([
      ["previous-primary",oldPrimary],
      ["previous-recovery",oldRecovery],
      ["current",{...recovered,active:true,gameId,teamId:state.cloud?.teamId||null,
        seasonId:state.cloud?.seasonId||null,plays:g.plays.length,snaps:g.snapRecords.length,
        writtenAt:written}]
    ]);
    const [checkCurrent,checkPrimary,checkRecovery]=await Promise.all([
      get("current"),get("previous-primary"),get("previous-recovery")]);
    if(verify(checkCurrent)!==raw||
       verify(checkPrimary)!==(oldPrimary.present?oldPrimary.raw:null)||
       verify(checkRecovery)!==(oldRecovery.present?oldRecovery.raw:null))
      throw Error("Durable backup verification failed. Nothing on this phone was cleared.");
    active=true;
    return {writtenAt:written,plays:g.plays.length,snaps:g.snapRecords.length};
  }
  function enqueueState(state,gameId){
    const g=validate(state,gameId);
    const raw=JSON.stringify(state),data={...entry(raw),active:true,gameId,
      teamId:state.cloud?.teamId||null,seasonId:state.cloud?.seasonId||null,
      plays:g.plays.length,snaps:g.snapRecords.length,writtenAt:Date.now()};
    const write=()=>putMany([["current",data]]);
    queue=queue.catch(()=>{}).then(write);
    return queue.then(async()=>{
      const saved=await get("current");
      if(verify(saved)!==raw)
        throw Error("Updated durable recovery did not verify.");
      active=true;return true;
    });
  }
  async function activeSnapshot(){
    const current=await get("current");
    if(!current?.active||!current?.present)return null;
    const raw=verify(current);
    const parsed=JSON.parse(raw);
    const g=validate(parsed,current.gameId);
    if(g.plays.length!==current.plays||g.snapRecords.length!==current.snaps)
      throw Error("Durable game counts differ.");
    active=true;
    return {state:parsed,gameId:current.gameId,writtenAt:current.writtenAt};
  }
  // The old main is still authoritative until a successfully verified new
  // primary is committed. If localStorage cannot fit it, the IndexedDB copy
  // remains the authoritative snapshot, including for future app restarts.
  async function commitLocal(state,gameId,storageSnapshot){
    await stage(state,gameId);
    const g=validate(state,gameId);
    let localSaved=false;
    try{
      const compact=storageSnapshot.compact(state);
      const encoded=storageSnapshot.encode(JSON.stringify(compact));
      const check=storageSnapshot.parse(encoded);
      const intended=validate(check,gameId);
      if(intended.plays.length!==g.plays.length||
         intended.snapRecords.length!==g.snapRecords.length||
         intended.plays.some((p,i)=>p.id!==g.plays[i].id)||
         intended.snapRecords.some((p,i)=>p.id!==g.snapRecords[i].id))
        throw Error("Compressed snapshot did not preserve the recovered game.");
      const store=root.localStorage;
      try{
        store.setItem(MAIN_KEY,encoded);
        localSaved=store.getItem(MAIN_KEY)===encoded;
      }catch(_){}
      if(!localSaved&&store.getItem(MAIN_KEY)!==null){
        // Do NOT erase the sole recovery slot if the old main is missing.
        // Both old copies are first verified in IndexedDB.
        try{
          store.removeItem(RECOVERY_KEY);
          store.setItem(MAIN_KEY,encoded);
          localSaved=store.getItem(MAIN_KEY)===encoded;
        }catch(e){
          console.warn("Local storage remains full; IndexedDB is authoritative",e);
        }
      }
      if(localSaved){
        const loaded=storageSnapshot.parse(store.getItem(MAIN_KEY));
        const actual=validate(loaded,gameId);
        if(actual.plays.length!==g.plays.length||
           actual.snapRecords.length!==g.snapRecords.length||
           actual.plays.some((p,i)=>p.id!==g.plays[i].id)||
           actual.snapRecords.some((p,i)=>p.id!==g.snapRecords[i].id))
          throw Error("Local snapshot verification failed.");
      }
    }catch(e){
      // IndexedDB was already committed AND verified before any attempt at
      // local compression, so a localStorage/codec failure is not data loss.
      console.warn("Local snapshot compacting skipped; verified IndexedDB copy retained",e);
    }
    return {saved:true,localSaved,durableSaved:true,plays:g.plays.length,snaps:g.snapRecords.length};
  }
  function isActive(){return active}
  function saveLater(state,gameId){
    if(!active)return Promise.resolve(false);
    return enqueueState(state,gameId);
  }
  // Recovery is explicitly deactivated when the user resets the device team.
  async function deactivate(){
    // Finish queued older writes before marking the durable record inactive.
    await queue.catch(()=>{});
    await putMany([["current",{present:false,active:false,endedAt:Date.now()}]]);
    active=false;
  }
  return {stage,commitLocal,activeSnapshot,isActive,saveLater,deactivate};
});