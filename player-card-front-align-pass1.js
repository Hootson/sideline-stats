(()=>{
const origFill=CanvasRenderingContext2D.prototype.fillText;
const origStroke=CanvasRenderingContext2D.prototype.strokeText;
const origDrawImage=CanvasRenderingContext2D.prototype.drawImage;

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
    // Existing approved name treatment retained.
    ctx.translate(12.5,8.5);
    ctx.rotate(-0.025);
    shrinkFontOnly(ctx,text,250,18);
  }else if(kind==='number'){
    // NUMBER: move 2 grid units left and 2 up from X14/Y28.
    // New center X12 / Y26. Existing banner angle is preserved.
    moveCenter(ctx,12,26);
    ctx.textAlign='center';
    shrinkFontOnly(ctx,text,pxW(14)*0.96,18);
  }else if(kind==='position'){
    // POSITION: move 2 grid units left and 4 up from X15/Y40.
    // New center X13 / Y36. Existing banner angle is preserved.
    moveCenter(ctx,13,36);
    ctx.textAlign='center';
    shrinkFontOnly(ctx,text,pxW(16)*0.96,14);
  }else if(kind==='team'){
    // TEAM NAME occupies X34–80. The prior pass moved the transform to a
    // "center" but left textAlign=left, so the label STARTED near the center
    // and ran off to the right. True midpoint is X57; center it there at Y92.
    moveCenter(ctx,57,92);
    ctx.textAlign='center';
    shrinkFontOnly(ctx,text,pxW(46)*0.96,14);
  }

  const out=orig.apply(ctx,args);
  ctx.restore();
  return out;
}

// The team logo is drawn by the vintage renderer as an image. Keep its size
// and crop treatment exactly the same, but lock its center to X16 / Y87.
CanvasRenderingContext2D.prototype.drawImage=function(...args){
  if(this?.canvas?.id==='pcCanvas'&&args.length===9){
    const dx=Number(args[5]),dy=Number(args[6]),dw=Number(args[7]),dh=Number(args[8]);
    if([dx,dy,dw,dh].every(Number.isFinite)){
      const cx=dx+dw/2,cy=dy+dh/2;
      const oldCx=FRONT.x+53*(FRONT.w/347);
      const oldCy=FRONT.y+405*(FRONT.h/455);
      if(Math.abs(cx-oldCx)<4&&Math.abs(cy-oldCy)<4){
        const targetCx=FRONT.x+FRONT.w*.16;
        const targetCy=FRONT.y+FRONT.h*.87;
        args[5]=dx+(targetCx-oldCx);
        args[6]=dy+(targetCy-oldCy);
      }
    }
  }
  return origDrawImage.apply(this,args);
};

CanvasRenderingContext2D.prototype.fillText=function(...args){return correctedCall(origFill,this,args)};
CanvasRenderingContext2D.prototype.strokeText=function(...args){return correctedCall(origStroke,this,args)};
})();
