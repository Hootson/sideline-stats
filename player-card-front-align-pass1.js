(()=>{
const origFill=CanvasRenderingContext2D.prototype.fillText;
const origStroke=CanvasRenderingContext2D.prototype.strokeText;

// Front card uses a 0–100 coordinate grid. The rendered canvas is 2x the
// logical 1000×1200 front card, with a logical origin of X=40, Y=30.
const FRONT={x:40,y:30,w:1000,h:1200,scale:2};
const pxX=n=>(FRONT.x+FRONT.w*n/100)*FRONT.scale;
const pxY=n=>(FRONT.y+FRONT.h*n/100)*FRONT.scale;
const pxW=n=>FRONT.w*n/100*FRONT.scale;

function classify(ctx,text){
  const t=ctx.getTransform();
  const x=t.e/FRONT.scale,y=t.f/FRONT.scale;
  if(y<260&&x>180&&x<330)return'name';
  if(y>300&&y<470&&x>130&&x<250)return'number';
  if(y>450&&y<610&&x>130&&x<250)return'position';
  if(y>1000&&y<1230&&x>250&&x<500&&String(text).trim())return'team';
  return null;
}

function shrinkFontOnly(ctx,text,targetWidth,minSize=16){
  const match=String(ctx.font).match(/(\d+(?:\.\d+)?)px/);
  if(!match)return;
  let size=Number(match[1]);
  while(size>minSize){
    ctx.font=ctx.font.replace(/\d+(?:\.\d+)?px/,size+'px');
    const m=ctx.measureText(text);
    const painted=Number(m.actualBoundingBoxLeft||0)+Number(m.actualBoundingBoxRight||m.width);
    if(painted<=targetWidth)break;
    size-=1;
  }
}

function moveCenter(ctx,xGrid,yGrid){
  const t=ctx.getTransform();
  // Preserve the element's existing scale + approved banner angle; replace
  // only its center point.
  ctx.setTransform(t.a,t.b,t.c,t.d,pxX(xGrid),pxY(yGrid));
}

function correctedCall(orig,ctx,args){
  const text=String(args[0]??'');
  const kind=classify(ctx,text);
  if(!kind)return orig.apply(ctx,args);
  ctx.save();

  if(kind==='name'){
    // Existing approved name treatment: roughly X 9–35, center X 22,
    // current Y/angle retained. Long names shrink by font size only.
    ctx.translate(12.5,8.5);
    ctx.rotate(-0.025);
    shrinkFontOnly(ctx,text,250,18);
  }else if(kind==='number'){
    // NUMBER: X 9–23, center X 14, Y 28.
    moveCenter(ctx,14,28);
    shrinkFontOnly(ctx,text,pxW(14)*0.96,18);
  }else if(kind==='position'){
    // POSITION: X 9–25, center X 15, Y 40.
    moveCenter(ctx,15,40);
    shrinkFontOnly(ctx,text,pxW(16)*0.96,14);
  }else if(kind==='team'){
    // TEAM NAME: X 34–80, center X 55, Y 92.
    moveCenter(ctx,55,92);
    shrinkFontOnly(ctx,text,pxW(46)*0.96,14);
  }

  const out=orig.apply(ctx,args);
  ctx.restore();
  return out;
}

CanvasRenderingContext2D.prototype.fillText=function(...args){return correctedCall(origFill,this,args)};
CanvasRenderingContext2D.prototype.strokeText=function(...args){return correctedCall(origStroke,this,args)};
})();
