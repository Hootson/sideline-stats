(()=>{
const origFill=CanvasRenderingContext2D.prototype.fillText;
const origStroke=CanvasRenderingContext2D.prototype.strokeText;
function classify(ctx,text){
  const t=ctx.getTransform();
  const x=t.e/2,y=t.f/2;
  if(y<260&&x>180&&x<330)return'name';
  if(y>300&&y<470&&x>130&&x<250)return'number';
  if(y>450&&y<610&&x>130&&x<250)return'position';
  return null;
}
function correctedCall(orig,ctx,args){
  const kind=classify(ctx,String(args[0]??''));
  if(!kind)return orig.apply(ctx,args);
  ctx.save();
  if(kind==='name'){
    // Move the whole name exactly two grid units right while preserving size,
    // angle and vertical placement from the previous approved pass.
    ctx.translate(12.5,8.5);
    ctx.rotate(-0.025);
    // Long names use true font-size reduction instead of horizontal compression.
    // The 25-unit target leaves a half-unit safety margin inside X 7–33 for italics.
    const text=String(args[0]??'');
    const match=String(ctx.font).match(/(\d+(?:\.\d+)?)px/);
    if(match){
      const originalSize=Number(match[1]);
      let size=originalSize;
      const targetWidth=250;
      while(size>18){
        ctx.font=ctx.font.replace(/\d+(?:\.\d+)?px/,size+'px');
        const m=ctx.measureText(text);
        const painted=Number(m.actualBoundingBoxLeft||0)+Number(m.actualBoundingBoxRight||m.width);
        if(painted<=targetWidth)break;
        size-=1;
      }
    }
  }else if(kind==='number'){
    ctx.translate(0,-3.5);
    ctx.rotate(-0.026);
  }else if(kind==='position'){
    ctx.translate(1.5,-4.5);
    ctx.rotate(-0.040);
  }
  const out=orig.apply(ctx,args);
  ctx.restore();
  return out;
}
CanvasRenderingContext2D.prototype.fillText=function(...args){return correctedCall(origFill,this,args)};
CanvasRenderingContext2D.prototype.strokeText=function(...args){return correctedCall(origStroke,this,args)};
})();
