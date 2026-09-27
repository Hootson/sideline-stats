(()=>{
const origFill=CanvasRenderingContext2D.prototype.fillText;
const origStroke=CanvasRenderingContext2D.prototype.strokeText;
const origDrawImage=CanvasRenderingContext2D.prototype.drawImage;
const origArc=CanvasRenderingContext2D.prototype.arc;

// Front card uses a 0–100 coordinate grid. The rendered canvas is 2x the
// logical 1000×1200 front card, with a logical origin of X=40, Y=30.
const FRONT={x:40,y:30,w:1000,h:1200,scale:2};
const pxX=n=>(FRONT.x+FRONT.w*n/100)*FRONT.scale;
const pxY=n=>(FRONT.y+FRONT.h*n/100)*FRONT.scale;
const pxW=n=>FRONT.w*n/100*FRONT.scale;
const LOGO_OLD={x:FRONT.x+53*(FRONT.w/347),y:FRONT.y+405*(FRONT.h/455)};
const LOGO_NEW={x:FRONT.x+FRONT.w*.16,y:FRONT.y+FRONT.h*.87};

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
  ctx.setTransform(t.a,t.b,t.c,t.d,pxX(xGrid),pxY(yGrid));
}

function correctedCall(orig,ctx,args){
  const text=String(args[0]??'');
  const kind=classify(ctx,text);
  if(!kind)return orig.apply(ctx,args);
  ctx.save();

  if(kind==='name'){
    ctx.translate(12.5,8.5);
    ctx.rotate(-0.025);
    shrinkFontOnly(ctx,text,250,18);
  }else if(kind==='number'){
    // Calibrated position retained: X12 / Y27.
    moveCenter(ctx,12,27);
    ctx.textAlign='center';
    shrinkFontOnly(ctx,text,pxW(14)*0.96,18);
  }else if(kind==='position'){
    // One grid unit lower than the last pass: X13 / Y39.
    // Increase the tilt by about 2° so the text runs parallel to the lower
    // edge of the black position panel.
    moveCenter(ctx,13,39);
    ctx.rotate(-0.070);
    ctx.textAlign='center';
    shrinkFontOnly(ctx,text,pxW(16)*0.96,14);
  }else if(kind==='team'){
    // Retain current calibrated team-name location.
    moveCenter(ctx,57,90);
    ctx.textAlign='center';
    shrinkFontOnly(ctx,text,pxW(46)*0.96,14);
  }

  const out=orig.apply(ctx,args);
  ctx.restore();
  return out;
}

// Move BOTH the logo image and its circular clipping mask to X16 / Y87.
CanvasRenderingContext2D.prototype.arc=function(x,y,r,...rest){
  if(this?.canvas?.id==='pcCanvas'&&Math.abs(x-LOGO_OLD.x)<3&&Math.abs(y-LOGO_OLD.y)<3){
    return origArc.call(this,LOGO_NEW.x,LOGO_NEW.y,r,...rest);
  }
  return origArc.call(this,x,y,r,...rest);
};

CanvasRenderingContext2D.prototype.drawImage=function(...args){
  if(this?.canvas?.id==='pcCanvas'&&args.length===9){
    const dx=Number(args[5]),dy=Number(args[6]),dw=Number(args[7]),dh=Number(args[8]);
    if([dx,dy,dw,dh].every(Number.isFinite)){
      const cx=dx+dw/2,cy=dy+dh/2;
      if(Math.abs(cx-LOGO_OLD.x)<4&&Math.abs(cy-LOGO_OLD.y)<4){
        args[5]=dx+(LOGO_NEW.x-LOGO_OLD.x);
        args[6]=dy+(LOGO_NEW.y-LOGO_OLD.y);
      }
    }
  }
  return origDrawImage.apply(this,args);
};

CanvasRenderingContext2D.prototype.fillText=function(...args){return correctedCall(origFill,this,args)};
CanvasRenderingContext2D.prototype.strokeText=function(...args){return correctedCall(origStroke,this,args)};
})();
