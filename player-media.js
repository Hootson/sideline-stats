(function(root){
  const BUCKET="player-media";
  const ACTION_MAX=1400, HEAD_MAX=800, QUALITY=.82;
  function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=()=>reject(r.error||new Error("Could not read image"));r.readAsDataURL(blob)})}
  function loadImage(source){return new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin="anonymous";img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Could not decode image"));img.src=source})}
  async function optimizeDataUrl(dataUrl,{maxDimension=ACTION_MAX,quality=QUALITY}={}){
    const img=await loadImage(dataUrl);const scale=Math.min(1,maxDimension/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
    const w=Math.max(1,Math.round((img.naturalWidth||img.width)*scale)),h=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
    const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d",{alpha:false});ctx.drawImage(img,0,0,w,h);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));if(!blob)throw new Error("Could not optimize image");
    return {blob,dataUrl:await blobToDataUrl(blob),width:w,height:h,bytes:blob.size};
  }
  async function optimizeFile(file,kind="action"){
    if(!file||!/^image\//.test(file.type||""))throw new Error("Choose an image file");
    return optimizeDataUrl(await blobToDataUrl(file),{maxDimension:kind==="headshot"?HEAD_MAX:ACTION_MAX});
  }
  function publicUrl(client,path){return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}
  async function uploadOptimized(client,playerId,kind,input){
    const source=input instanceof Blob?await blobToDataUrl(input):String(input||"");
    const optimized=source.startsWith("data:")?await optimizeDataUrl(source,{maxDimension:kind==="headshot"?HEAD_MAX:ACTION_MAX}):null;
    if(!optimized)throw new Error("Player photo must be local image data before upload");
    const path=`${playerId}/${kind}-${Date.now()}.jpg`;
    const {error}=await client.storage.from(BUCKET).upload(path,optimized.blob,{contentType:"image/jpeg",cacheControl:"31536000",upsert:false});if(error)throw error;
    const field=kind==="headshot"?"headshot_path":"action_photo_path",legacy=kind==="headshot"?"headshot_data":"action_photo_data";
    const {error:updateError}=await client.from("players").update({[field]:path,[legacy]:null}).eq("id",playerId);
    if(updateError){try{await client.storage.from(BUCKET).remove([path])}catch(_e){}throw updateError}
    return {path,url:publicUrl(client,path),bytes:optimized.bytes,width:optimized.width,height:optimized.height};
  }
  root.SidelinePlayerMedia={BUCKET,ACTION_MAX,HEAD_MAX,QUALITY,optimizeFile,optimizeDataUrl,uploadOptimized,publicUrl};
})(window);
