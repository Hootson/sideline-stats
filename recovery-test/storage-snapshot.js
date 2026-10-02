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
    const full=JSON.stringify(state);
    const compactState=compact(state);
    const compactJson=JSON.stringify(compactState);
    let usedCompactMain=false,recoverySaved=false;
    try{storage.removeItem(recoveryKey)}catch(_){ }
    try{
      storage.setItem(key,full);
    }catch(fullError){
      storage.setItem(key,compactJson);
      usedCompactMain=true;
    }
    try{storage.setItem(recoveryKey,compactJson);recoverySaved=true}catch(_){ }
    return {usedCompactMain,recoverySaved,fullBytes:full.length*2,compactBytes:compactJson.length*2};
  }

  return {compact,save};
});
