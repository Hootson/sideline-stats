(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.SidelineStorageSnapshot=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function compact(state){
    return JSON.parse(JSON.stringify(state,function(key,value){
      if((key==="logoData"||key==="opponentLogoData")&&typeof value==="string"&&value.startsWith("data:image/"))return null;
      return value;
    }));
  }

  function save(storage,key,recoveryKey,state){
    // Never remove the last recovery copy before a replacement is safely saved.
    // On iOS, a failed localStorage write must not destroy the existing snapshot.
    const full=JSON.stringify(state);
    let usedCompactMain=false,recoverySaved=false;
    let compactJson=null;
    try{
      storage.setItem(key,full);
    }catch(fullError){
      // Keep plays, snaps, credits and all other statistics. Only embedded logo
      // images are omitted in the compact fallback.
      compactJson=JSON.stringify(compact(state));
      try{
        storage.setItem(key,compactJson);
        usedCompactMain=true;
      }catch(compactError){
        const err=new Error("Browser storage quota prevented saving the game snapshot; existing saved data was preserved. Download a Sync Backup and retry cloud sync.");
        err.cause=compactError;
        throw err;
      }
    }
    if(compactJson===null)compactJson=JSON.stringify(compact(state));
    // Recovery is best-effort. The main snapshot has already been committed;
    // a quota error here must not be reported as failure to save game stats.
    try{storage.setItem(recoveryKey,compactJson);recoverySaved=true}catch(_){ }
    return {usedCompactMain,recoverySaved,fullBytes:full.length*2,compactBytes:compactJson.length*2};
  }

  return {compact,save};
});
