(()=>{
const orig=CanvasRenderingContext2D.prototype.drawImage;
let backPass=false,lastImage=null;
CanvasRenderingContext2D.prototype.drawImage=function(...a){
 if(this?.canvas?.id==='pcCanvas'&&window.BBSBackMaster&&a.length>=5){
  const dy=Number(a[a.length===5?2:6]);
  if(Number.isFinite(dy)&&dy>1200)backPass=true;
 }
 return orig.apply(this,a)
};
window.addEventListener('bbs-player-card-back-data',async e=>{
 const d=e.detail||{},cv=document.querySelector('#pcCanvas');if(!cv)return;
 const c=cv.getContext('2d');await window.BBSBackMaster?.draw(c,d.x,d.y,d.w,d.h,d);
});
})();