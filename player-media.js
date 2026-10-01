(function(root){
  const BUCKET="player-media";
  const ACTION_MAX=1400, HEAD_MAX=800, QUALITY=.82;
  const STATE_KEY="sidelineStatsData";
  const SUPABASE_URL="https://eyuvgzhkhcpwtcbmsvct.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY="sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l";
  let mediaClient=null,migrationRunning=false,migrationQueued=false;

  function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=()=>reject(r.error||new Error("Could not read image"));r.readAsDataURL(blob)})}
  function loadImage(source){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Could not decode image"));img.src=source})}
  function approxBytes(dataUrl){const b64=String(dataUrl||"").split(",")[1]||"";return Math.floor(b64.length*.75)}
  function hashText(value){let h=2166136261;const s=String(value||"");for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
  async function optimizeDataUrl(dataUrl,{maxDimension=ACTION_MAX,quality=QUALITY}={}){
    const img=await loadImage(dataUrl);
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    const scale=Math.min(1,maxDimension/Math.max(iw,ih));
    const w=Math.max(1,Math.round(iw*scale)),h=Math.max(1,Math.round(ih*scale));
    const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext("2d",{alpha:false});ctx.drawImage(img,0,0,w,h);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
    if(!blob)throw new Error("Could not optimize image");
    return {blob,dataUrl:await blobToDataUrl(blob),width:w,height:h,bytes:blob.size};
  }
  async function optimizeFile(file,kind="action"){
    if(!file||!/^image\//.test(file.type||""))throw new Error("Choose an image file");
    const original=await blobToDataUrl(file);
    return optimizeDataUrl(original,{maxDimension:kind==="headshot"?HEAD_MAX:ACTION_MAX});
  }
  function publicUrl(client,path){return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}
  async function uploadOptimized(client,playerId,kind,input,{keepCompatibility=true}={}){
    const source=input instanceof Blob?await blobToDataUrl(input):String(input||"");
    const optimized=await optimizeDataUrl(source,{maxDimension:kind==="headshot"?HEAD_MAX:ACTION_MAX});
    const fingerprint=hashText(optimized.dataUrl);
    const path=`${playerId}/${kind}-${fingerprint}.jpg`;
    const {error}=await client.storage.from(BUCKET).upload(path,optimized.blob,{contentType:"image/jpeg",cacheControl:"31536000",upsert:true});
    if(error)throw error;
    const field=kind==="headshot"?"headshot_path":"action_photo_path";
    const legacy=kind==="headshot"?"headshot_data":"action_photo_data";
    const payload={[field]:path,[legacy]:keepCompatibility?optimized.dataUrl:null};
    const {error:updateError}=await client.from("players").update(payload).eq("id",playerId);
    if(updateError)throw updateError;
    return {path,url:publicUrl(client,path),bytes:optimized.bytes,width:optimized.width,height:optimized.height,fingerprint};
  }
  async function migrateLegacySeason(client,seasonId){
    if(!client||!seasonId)return {migrated:0,beforeBytes:0,afterBytes:0};
    const {data,error}=await client.from("players").select("id,action_photo_data,headshot_data,action_photo_path,headshot_path").eq("season_id",seasonId);
    if(error)throw error;
    let migrated=0,beforeBytes=0,afterBytes=0;
    for(const p of data||[]){
      for(const kind of ["action","headshot"]){
        const legacy=kind==="action"?p.action_photo_data:p.headshot_data;
        const currentPath=kind==="action"?p.action_photo_path:p.headshot_path;
        if(!legacy||!String(legacy).startsWith("data:image/"))continue;
        beforeBytes+=approxBytes(legacy);
        const optimized=await optimizeDataUrl(legacy,{maxDimension:kind==="headshot"?HEAD_MAX:ACTION_MAX});
        const fingerprint=hashText(optimized.dataUrl),expected=`${p.id}/${kind}-${fingerprint}.jpg`;
        afterBytes+=optimized.bytes;
        if(currentPath===expected&&legacy===optimized.dataUrl)continue;
        const {error:uploadError}=await client.storage.from(BUCKET).upload(expected,optimized.blob,{contentType:"image/jpeg",cacheControl:"31536000",upsert:true});
        if(uploadError)throw uploadError;
        const field=kind==="headshot"?"headshot_path":"action_photo_path";
        const legacyField=kind==="headshot"?"headshot_data":"action_photo_data";
        const {error:updateError}=await client.from("players").update({[field]:expected,[legacyField]:optimized.dataUrl}).eq("id",p.id);
        if(updateError)throw updateError;
        migrated++;
      }
    }
    return {migrated,beforeBytes,afterBytes};
  }

  function readState(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||"null")}catch(_){return null}}
  function statkeeperSeason(){const s=readState();return s?.cloud?.deviceRole==="statkeeper"&&s?.cloud?.seasonId?s.cloud.seasonId:null}
  async function ensureClient(){
    if(mediaClient)return mediaClient;
    if(!root.supabase?.createClient)return null;
    mediaClient=root.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const {data}=await mediaClient.auth.getSession();return data?.session?mediaClient:null;
  }
  async function runMigration(){
    if(migrationRunning){migrationQueued=true;return}
    const seasonId=statkeeperSeason();if(!seasonId)return;
    migrationRunning=true;
    try{const client=await ensureClient();if(client)await migrateLegacySeason(client,seasonId)}
    catch(e){console.warn("Player media optimization skipped",e)}
    finally{migrationRunning=false;if(migrationQueued){migrationQueued=false;setTimeout(runMigration,1200)}}
  }

  function isPlayerMediaInput(input){
    if(!(input instanceof HTMLInputElement)||input.type!=="file")return false;
    const nearby=input.closest(".modal-card,.card,form,section")?.textContent||"";
    const marker=`${input.id||""} ${input.name||""} ${input.getAttribute("aria-label")||""} ${nearby}`.toLowerCase();
    return marker.includes("headshot")||marker.includes("action photo")||marker.includes("player profile")||marker.includes("player photo");
  }
  function mediaKind(input){const marker=`${input.id||""} ${input.name||""} ${input.getAttribute("aria-label")||""} ${input.closest(".modal-card,.card,form,section")?.textContent||""}`.toLowerCase();return marker.includes("headshot")?"headshot":"action"}
  document.addEventListener("change",async e=>{
    const input=e.target;if(!isPlayerMediaInput(input)||input.dataset.sidelineOptimized==="1")return;
    const file=input.files?.[0];if(!file||!/^image\//.test(file.type||""))return;
    if(typeof DataTransfer==="undefined")return;
    e.preventDefault();e.stopImmediatePropagation();
    try{
      const kind=mediaKind(input),optimized=await optimizeFile(file,kind);
      const dt=new DataTransfer();dt.items.add(new File([optimized.blob],file.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg",lastModified:Date.now()}));
      input.files=dt.files;input.dataset.sidelineOptimized="1";
      input.dispatchEvent(new Event("change",{bubbles:true}));
      delete input.dataset.sidelineOptimized;
      setTimeout(runMigration,2500);
    }catch(err){console.warn("Player photo optimization failed",err);input.dataset.sidelineOptimized="1";input.dispatchEvent(new Event("change",{bubbles:true}));delete input.dataset.sidelineOptimized}
  },true);

  async function compactLocalPlayerPhotos(){
    let raw;try{raw=localStorage.getItem(STATE_KEY)}catch(_){return}if(!raw)return;
    let state;try{state=JSON.parse(raw)}catch(_){return}
    let changed=false;
    async function walk(node,key=""){
      if(!node||typeof node!=="object")return;
      for(const [k,v] of Object.entries(node)){
        if(typeof v==="string"&&v.startsWith("data:image/")&&/(action.*photo|headshot|player.*photo|photo.*data)/i.test(k)&&v.length>120000){
          try{const kind=/headshot/i.test(k)?"headshot":"action",o=await optimizeDataUrl(v,{maxDimension:kind==="headshot"?HEAD_MAX:ACTION_MAX});node[k]=o.dataUrl;changed=true}catch(_e){}
        }else if(v&&typeof v==="object")await walk(v,k);
      }
    }
    await walk(state);
    if(changed){try{localStorage.setItem(STATE_KEY,JSON.stringify(state))}catch(e){console.warn("Could not compact local player photos",e)}}
  }

  root.SidelinePlayerMedia={BUCKET,ACTION_MAX,HEAD_MAX,QUALITY,optimizeFile,optimizeDataUrl,uploadOptimized,migrateLegacySeason,publicUrl,runMigration};
  setTimeout(()=>{compactLocalPlayerPhotos();runMigration()},1200);
  setTimeout(runMigration,6000);
})(window);
