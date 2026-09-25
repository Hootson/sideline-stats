// Protects a live stat-keeping session from accidental navigation/reload and stale clock state.
export function installHardcourtSessionGuard({readLocal=()=>({})}={}){
 const isLive=()=>{const s=readLocal()||{};return !!(s.running||(Array.isArray(s.events)&&s.events.length>0&&Number(s.clockMs||0)>0));};
 const stopStaleClock=()=>{const s=readLocal()||{};if(!s.running)return;const now=Date.now(),last=Number(s.lastTick||0);if(last&&now-last>15000){s.running=false;s.lastTick=null;localStorage.setItem('hardcourt-alpha',JSON.stringify(s));}};
 stopStaleClock();
 window.addEventListener('beforeunload',e=>{if(!isLive())return;e.preventDefault();e.returnValue='';});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){const s=readLocal()||{};if(s.running){s.lastTick=Date.now();localStorage.setItem('hardcourt-alpha',JSON.stringify(s));}}else stopStaleClock()});
 window.addEventListener('pageshow',stopStaleClock);
}
