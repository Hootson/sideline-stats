(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.SidelineStorageSnapshot=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const PREFIX="SSZ1:";
  const RECOVERY_INTERVAL_MS=30000;
  let lastRecoveryAt=0;

  function compact(state){
    return JSON.parse(JSON.stringify(state,function(key,value){
      if((key==="logoData"||key==="opponentLogoData")&&typeof value==="string"&&value.startsWith("data:image/"))return null;
      return value;
    }));
  }
  // Byte-oriented LZW, versioned so older plain-JSON snapshots remain readable.
  // Reset the dictionary at 65535 codes, rather than allowing 16-bit overflow.
  function encode(json){
    const bytes=new TextEncoder().encode(json),dict=new Map(),codes=[];
    let next=256,word="";
    for(let i=0;i<bytes.length;i++){
      const char=String.fromCharCode(bytes[i]),joined=word+char;
      if(joined.length===1||dict.has(joined)){word=joined;continue}
      codes.push(word.length===1?word.charCodeAt(0):dict.get(word));
      if(next<65535)dict.set(joined,next++);
      else{dict.clear();next=256}
      word=char;
    }
    if(word)codes.push(word.length===1?word.charCodeAt(0):dict.get(word));
    const buffer=new Uint8Array(codes.length*2);
    for(let i=0;i<codes.length;i++){buffer[i*2]=codes[i]>>>8;buffer[i*2+1]=codes[i]&255}
    let binary="";
    for(let i=0;i<buffer.length;i+=8192)binary+=String.fromCharCode.apply(null,buffer.subarray(i,i+8192));
    return PREFIX+btoa(binary);
  }
  function decode(value){
    if(typeof value!=="string"||!value.startsWith(PREFIX))return value;
    const binary=atob(value.slice(PREFIX.length));
    if(binary.length%2)throw new Error("Invalid compressed snapshot length");
    const dict=new Map(),parts=[];
    let next=256,previous="";
    for(let i=0;i<binary.length;i+=2){
      const code=(binary.charCodeAt(i)<<8)|binary.charCodeAt(i+1);
      let entry=code<256?String.fromCharCode(code):dict.get(code);
      if(entry===undefined){
        if(code!==next||!previous)throw new Error("Invalid compressed snapshot code");
        entry=previous+previous[0];
      }
      parts.push(entry);
      if(previous){
        if(next<65535)dict.set(next++,previous+entry[0]);
        else{dict.clear();next=256}
      }
      previous=entry;
    }
    const joined=parts.join(""),bytes=new Uint8Array(joined.length);
    for(let i=0;i<joined.length;i++)bytes[i]=joined.charCodeAt(i);
    return new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  }
  function parse(value){return JSON.parse(decode(value))}
  function save(storage,key,recoveryKey,state){
    // Always preserve the previous successfully written snapshot on quota errors.
    const full=JSON.stringify(state);
    let usedCompactMain=false,usedCompressedMain=false,recoverySaved=false,mainSaved=false;
    // Keep logos when space permits. If the quota is reached, compress the
    // *complete* snapshot before falling back to a no-image snapshot.
    try{storage.setItem(key,full);mainSaved=true}
    catch(fullError){
      try{storage.setItem(key,encode(full));usedCompressedMain=true;mainSaved=true}
      catch(compressedFullError){
        const small=JSON.stringify(compact(state));
        // Always keep a new fully verified data copy before reclaiming the
        // previous large primary snapshot. Images can be restored separately;
        // plays, rosters, snaps and sync identities must remain intact.
        const compactEncoded=encode(small);
        try{storage.setItem(key,compactEncoded);usedCompactMain=true;usedCompressedMain=true;mainSaved=true}
        catch(compactError){
          try{
            // When two old snapshots fill Safari's localStorage quota, the
            // recovery slot can often be replaced even though the main slot
            // cannot grow. The latest *entire compact state* is committed to
            // recovery BEFORE any prior primary snapshot is removed.
            storage.setItem(recoveryKey,compactEncoded);
            if(storage.getItem(recoveryKey)!==compactEncoded||
               decode(storage.getItem(recoveryKey))!==small)
              throw Error("Recovery snapshot verification failed");
            recoverySaved=true;
            lastRecoveryAt=Date.now();
            // Only after the new recovery is verified do we reclaim the
            // oversized primary. If this fails, retain the new recovery and
            // surface an error instead of claiming the save was successful.
            storage.removeItem(key);
            if(storage.getItem(key)!==null)
              throw Error("Old primary snapshot could not be released");
            try{
              storage.setItem(key,compactEncoded);
              mainSaved=true;usedCompactMain=true;usedCompressedMain=true;
            }catch(_){
              // The verified recovery is the only snapshot. load() reads it
              // before attempting obsolete migration keys.
            }
            return {usedCompactMain,usedCompressedMain,recoverySaved,mainSaved,
              recoveryPrimary:!mainSaved,fullBytes:full.length*2};
          }catch(recoveryError){
            const err=new Error("Browser quota prevented saving. The previous primary snapshot was not intentionally cleared unless a new verified recovery was committed.");
            err.cause=recoveryError;throw err;
          }
        }
      }
    }
    // Recovery is a separate, compressed safety copy. Throttle the CPU-intensive
    // compression during live games, and never delete the previous recovery copy.
    const now=Date.now();
    if(now-lastRecoveryAt>=RECOVERY_INTERVAL_MS){
      try{
        const recovery=encode(JSON.stringify(compact(state)));
        storage.setItem(recoveryKey,recovery);
        lastRecoveryAt=now;recoverySaved=true;
      }catch(e){/* Main snapshot is already safe. Retain older recovery copy. */}
    }
    return {usedCompactMain,usedCompressedMain,recoverySaved,mainSaved,fullBytes:full.length*2};
  }
  return {compact,encode,decode,parse,save};
});
