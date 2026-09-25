// Lightweight integrity checks around the mature game runtime.
// Repairs impossible transient state without rewriting historical stat events.
export function installHardcourtGameIntegrity({readLocal=()=>({})}={}){
 const KEY='hardcourt-alpha';
 const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
 function repair(){
   const s=readLocal()||{};let changed=false;
   const roster=Array.isArray(s.roster)?s.roster:[],ids=new Set(roster.map(p=>p.id));
   const active=Array.isArray(s.active)?s.active.filter((id,i,a)=>ids.has(id)&&a.indexOf(id)===i):[];
   if(JSON.stringify(active)!==JSON.stringify(s.active||[])){s.active=active.slice(0,5);changed=true}
   if(!Number.isFinite(Number(s.clockMs))||Number(s.clockMs)<0){s.clockMs=0;s.running=false;s.lastTick=null;changed=true}
   if(Number(s.period||0)<1){s.period=1;changed=true}
   if(s.running&&s.clockMs<=0){s.running=false;s.lastTick=null;changed=true}
   if(s.pendingShot&&(!s.pendingShot.x&&!s.pendingShot.y)&&s.pendingShot.x!==0){s.pendingShot=null;changed=true}
   if(changed)save(s);return changed;
 }
 repair();
 window.addEventListener('pageshow',repair);
 window.addEventListener('online',repair);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)repair()});
 return{repair};
}
