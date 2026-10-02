(()=>{
  const SCALE=4;
  const UPSCALE_STEPS=[2,4];

  function load(src){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=reject;
      img.src=src;
    });
  }

  function drawScaled(source,width,height,soften){
    const c=document.createElement('canvas');
    c.width=width;c.height=height;
    const g=c.getContext('2d',{alpha:true});
    g.clearRect(0,0,width,height);
    g.imageSmoothingEnabled=true;
    g.imageSmoothingQuality='high';
    if(soften && 'filter' in g) g.filter='blur(.35px)';
    g.drawImage(source,0,0,width,height);
    if('filter' in g) g.filter='none';
    return c;
  }

  async function upscaleDataUrl(src,{mask=false}={}){
    const img=await load(src);
    let current=img;
    const baseW=img.naturalWidth||img.width;
    const baseH=img.naturalHeight||img.height;
    for(const step of UPSCALE_STEPS){
      current=drawScaled(current,Math.round(baseW*step),Math.round(baseH*step),mask&&step===SCALE);
    }
    return current.toDataURL('image/png');
  }

  async function prepare(){
    const t=window.PLAYER_CARD_TEMPLATE;
    if(!t||!t.base||!t.primary||!t.accent) return;
    const [base,primary,accent]=await Promise.all([
      upscaleDataUrl(t.base),
      upscaleDataUrl(t.primary,{mask:true}),
      upscaleDataUrl(t.accent,{mask:true})
    ]);
    window.PLAYER_CARD_TEMPLATE={...t,base,primary,accent,renderScale:SCALE,quality:'high'};
  }

  window.PLAYER_CARD_TEMPLATE_READY=prepare().catch(err=>{
    console.warn('Player card template quality pass skipped',err);
  });
})();
