// Protects a live stat-keeping session from accidental navigation/reload and stale clock state.
export function installHardcourtSessionGuard({readLocal=()=>({})}={}){
 const KEY='hardcourt-alpha',save=s=>localStorage.setItem(KEY,JSON.stringify(s));let intentional=false;
 const hasEvents=s=>Array.isArray(s.events)&&s.events.length>0;
 const isLive=()=>{const s=readLocal()||{};return !!(s.running||(hasEvents(s)&&Number(s.clockMs||0)>0));};
 const stopStaleClock=()=>{const s=readLocal()||{};if(!s.running)return false;const now=Date.now(),last=Number(s.lastTick||0);if(!last||now-last>15000||Number(s.clockMs||0)<=0){s.running=false;s.lastTick=null;save(s);return true}return false};
 const prepareNavigation=()=>{intentional=true;const s=readLocal()||{};if(s.running){s.running=false;s.lastTick=null;save(s)}return true};
 stopStaleClock();
 window.addEventListener('beforeunload',e=>{if(intentional||!isLive())return;e.preventDefault();e.returnValue='';});
 document.addEventListener('click',e=>{const target=e.target?.closest?.('a[href]');if(!target)return;const href=target.getAttribute('href')||'';if(!href||href.startsWith('#')||target.target==='_blank'||target.hasAttribute('download'))return;prepareNavigation()},true);
 document.addEventListener('visibilitychange',()=>{const s=readLocal()||{};if(document.hidden){if(s.running){s.lastTick=Date.now();save(s)}}else{intentional=false;stopStaleClock()}});
 window.addEventListener('pageshow',()=>{intentional=false;stopStaleClock()});
 window.addEventListener('pagehide',()=>{const s=readLocal()||{};if(s.running){s.running=false;s.lastTick=null;save(s)}});
 window.addEventListener('offline',()=>{const s=readLocal()||{};if(s.running&&Number(s.clockMs||0)<=0){s.running=false;s.lastTick=null;save(s)}});
 window.bbsPrepareHardcourtNavigation=prepareNavigation;
 return{isLive,stopStaleClock,prepareNavigation};
}
