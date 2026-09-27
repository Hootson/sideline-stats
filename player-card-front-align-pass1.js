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
    ctx.translate(7.5,-3.5);
    ctx.rotate(-0.025);
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