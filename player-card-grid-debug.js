(()=>{
const GRID_ID='pcGridDebug';
let timer=null;

// Temporary alignment shim for the front-card player name.
const NAME_OLD={x:40+72*(1000/347),y:30+62*(1200/455),a:-.115};
const NAME_NEW={x:40+58.1*(1000/347),y:30+48.35*(1200/455),a:-.145};
const nativeTranslate=CanvasRenderingContext2D.prototype.translate;
const nativeRotate=CanvasRenderingContext2D.prototype.rotate;
let adjustNextRotate=false;
CanvasRenderingContext2D.prototype.translate=function(x,y){
 const isCard=this?.canvas?.id==='pcCanvas';
 if(isCard&&Math.abs(x-NAME_OLD.x)<1.5&&Math.abs(y-NAME_OLD.y)<1.5){adjustNextRotate=true;return nativeTranslate.call(this,NAME_NEW.x,NAME_NEW.y)}
 return nativeTranslate.call(this,x,y)
};
CanvasRenderingContext2D.prototype.rotate=function(a){
 if(this?.canvas?.id==='pcCanvas'&&adjustNextRotate&&Math.abs(a-NAME_OLD.a)<.02){adjustNextRotate=false;return nativeRotate.call(this,NAME_NEW.a)}
 adjustNextRotate=false;return nativeRotate.call(this,a)
};

function cardGrid(ctx,X,Y,CW,CH,title){
 ctx.save();ctx.textBaseline='middle';ctx.font='900 16px Arial Black,Impact,sans-serif';
 for(let n=0;n<=100;n+=5){
  const xx=X+CW*n/100,yy=Y+CH*n/100,major=n%10===0;
  ctx.strokeStyle=major?'rgba(255,45,45,.82)':'rgba(35,105,255,.58)';ctx.lineWidth=major?2:1;
  ctx.beginPath();ctx.moveTo(xx,Y);ctx.lineTo(xx,Y+CH);ctx.stroke();
  ctx.beginPath();ctx.moveTo(X,yy);ctx.lineTo(X+CW,yy);ctx.stroke();
  if(major){ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.92)';ctx.fillStyle='rgba(255,255,235,.98)';ctx.strokeText(String(n),xx,Y+18);ctx.fillText(String(n),xx,Y+18);ctx.textAlign='left';ctx.strokeText(String(n),X+7,yy);ctx.fillText(String(n),X+7,yy)}
 }
 const lw=390,lh=150,lx=X+(CW-lw)/2,ly=Y+(CH-lh)/2;
 ctx.fillStyle='rgba(246,241,218,.92)';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.fillRect(lx,ly,lw,lh);ctx.strokeRect(lx,ly,lw,lh);
 ctx.textAlign='center';ctx.fillStyle='#111';ctx.font='900 22px Arial Black,Impact,sans-serif';ctx.fillText(title,X+CW/2,ly+28);
 ctx.font='700 17px Arial,sans-serif';ctx.fillText('X: 0 LEFT  →  100 RIGHT',X+CW/2,ly+58);ctx.fillText('Y: 0 TOP   →  100 BOTTOM',X+CW/2,ly+84);
 ctx.fillStyle='#d71920';ctx.fillText('RED = MAJOR 10',X+CW/2-92,ly+116);ctx.fillStyle='#175fd1';ctx.fillText('BLUE = MINOR 5',X+CW/2+92,ly+116);ctx.restore()
}
function drawGrid(){
 const canvas=document.querySelector('#pcCanvas'),box=document.querySelector('#'+GRID_ID);if(!canvas||!box?.checked)return;
 const ctx=canvas.getContext('2d'),S=2,X=40,FY=30,CW=1000,CH=1200,GAP=28,BY=FY+CH+GAP;
 ctx.save();ctx.setTransform(S,0,0,S,0,0);cardGrid(ctx,X,FY,CW,CH,'FRONT CARD COORDINATES');cardGrid(ctx,X,BY,CW,CH,'BACK CARD COORDINATES');ctx.restore()
}
function install(){
 const panel=document.querySelector('.pc-panel');if(!panel||document.querySelector('#'+GRID_ID))return;const reset=panel.querySelector('.pc-reset-row');if(!reset)return;
 const label=document.createElement('label');label.style.cssText='display:flex;align-items:center;gap:6px;font-size:12px;font-weight:900;padding:7px 9px;background:#fff6dd;border:1px solid #edd89a;border-radius:8px';label.innerHTML=`<input id="${GRID_ID}" type="checkbox"> Show alignment grid`;
 reset.appendChild(label);const box=label.querySelector('input');box.addEventListener('change',()=>{clearInterval(timer);timer=null;if(box.checked){drawGrid();timer=setInterval(drawGrid,350)}else document.querySelector('#pcBuild')?.click()})
}
const mo=new MutationObserver(()=>install());mo.observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();