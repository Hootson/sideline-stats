/* Quota-safe, local-only recovery for iOS Gridiron.
 * Store ONE compact, compressed, verified snapshot in IndexedDB.
 * Existing localStorage primary and backup are NEVER removed or overwritten. */
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
    const g=s.games.find(x=>x.id===gameId);
    if(!g||!Array.isArray(g.plays)||!Array.isArray(g.snapRecords))
      throw Error("Recovered game is missing.");
    if(new Set(g.plays.map(p=>p.id)).size!==g.plays.length)
      throw Error("Duplicate recovered play IDs.");
    if(new Set(g.snapRecords.map(p=>p.id)).size!==g.snapRecords.length)
      throw Error("Duplicate recovered snap IDs.");
    return g;
  }

  function prepared(state,gameId){
    const g=validate(state,gameId),snapshot=root.SidelineStorageSnapshot;
    if(!snapshot?.encode||!snapshot?.parse||!snapshot?.compact)
      throw Error("Verified snapshot codec unavailable.");
    // Old 9.4 MB JSON + two old snapshots would overflow iOS IndexedDB.
    // Strip recoverable image strings and compress once, BEFORE opening a write
    // transaction. The previous phone copies stay untouched in localStorage.
    const compact=snapshot.compact(state),raw=JSON.stringify(compact);
    const encoded=snapshot.encode(raw);
    const decoded=snapshot.decode(encoded);
    if(decoded!==raw)
      throw Error("Compressed recovery verification failed.");
    const checked=validate(JSON.parse(decoded),gameId);
    if(checked.plays.length!==g.plays.length||
       checked.snapRecords.length!==g.snapRecords.length||
       checked.plays.some((p,i)=>String(p.id)!==String(g.plays[i].id))||
       checked.snapRecords.some((s,i)=>String(s.id)!==String(g.snapRecords[i].id)))
      throw Error("Compressed game identities or counts differ.");
    return {record:{...entry(encoded),active:true,gameId,
      teamId:state.cloud?.teamId||null,seasonId:state.cloud?.seasonId||null,
      localPersistVersion:Number(state.localPersistVersion||0),
      plays:g.plays.length,snaps:g.snapRecords.length,writtenAt:Date.now(),
      format:"compressed-v2"},
      compactSize:encoded.length,uncompressedSize:raw.length};
  }
  function readRecord(record){
    const encoded=verify(record);
    if(!encoded)return null;
    const snapshot=root.SidelineStorageSnapshot;
    if(!snapshot?.parse)throw Error("Recovery snapshot decoder unavailable.");
    return snapshot.parse(encoded);
  }
  async function stage(state,gameId){
    const data=prepared(state,gameId);
    // ONE small record, no copy of the old localStorage data into IndexedDB:
    // those existing snapshots remain unchanged as a rollback path.
    await putMany([["current",data.record]]);
    const readback=await get("current");
    if(!readback?.active||verify(readback)!==data.record.raw)
      throw Error("Durable compressed snapshot did not verify.");
    const checked=validate(readRecord(readback),gameId);
    if(checked.plays.length!==data.record.plays||
       checked.snapRecords.length!==data.record.snaps)
      throw Error("Recovered play and snap totals changed in storage.");
    active=true;
    return {saved:true,durableSaved:true,localSaved:false,
      writtenAt:readback.writtenAt,plays:data.record.plays,
      snaps:data.record.snaps,storedChars:data.compactSize};
  }
  function enqueueState(state,gameId){
    const data=prepared(state,gameId);
    // Serialize async writes so a slower earlier snapshot cannot replace
    // the latest statkeeper edit. Keep previous durable data on any abort.
    const write=()=>putMany([["current",data.record]]);
    queue=queue.catch(()=>{}).then(write);
    return queue.then(async()=>{
      const saved=await get("current");
      if(verify(saved)!==data.record.raw)
        throw Error("Updated durable recovery did not verify.");
      active=true;return true;
    });
  }
  async function activeSnapshot(){
    await queue.catch(()=>{});
    const current=await get("current");
    if(!current?.active||!current?.present)return null;
    const parsed=readRecord(current);
    const g=validate(parsed,current.gameId);
    if(g.plays.length!==current.plays||g.snapRecords.length!==current.snaps)
      throw Error("Durable game counts differ.");
    active=true;
    return {state:parsed,gameId:current.gameId,writtenAt:current.writtenAt};
  }
  async function commitLocal(state,gameId){
    // Do not touch either localStorage slot: both saved external JSON files
    // and the prior phone snapshot remain available if this write fails.
    return stage(state,gameId);
  }
  function isActive(){return active}
  function saveLater(state,gameId){
    if(!active)return Promise.resolve(false);
    return enqueueState(state,gameId);
  }
  // Recovery is explicitly deactivated when the user resets the device team.
  async function deactivate(){
    await queue.catch(()=>{});
    await putMany([["current",{present:false,active:false,endedAt:Date.now()}]]);
    active=false;
  }
  return {stage,commitLocal,activeSnapshot,isActive,saveLater,deactivate};
});