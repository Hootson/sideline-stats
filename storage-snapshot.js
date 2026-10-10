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
    try{storage.setItem(key,full);mainSaved=true}
    catch(fullError){
      const small=JSON.stringify(compact(state));
      try{storage.setItem(key,small);usedCompactMain=true;mainSaved=true}
      catch(compactError){
        // Compression is an emergency fallback, not work done on every play.
        const compressed=encode(small);
        try{storage.setItem(key,compressed);usedCompactMain=true;usedCompressedMain=true;mainSaved=true}
        catch(compressedError){
          const err=new Error("Browser storage quota prevented saving game data. Previous saved snapshot preserved.");
          err.cause=compressedError;throw err;
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
