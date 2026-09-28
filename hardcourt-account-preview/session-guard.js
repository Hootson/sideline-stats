// Protects a live stat-keeping session from accidental navigation/reload and stale clock state.
export function installHardcourtSessionGuard({readLocal=()=>({})}={}){
 const KEY='hardcourt-alpha',save=s=>localStorage.setItem(KEY,JSON.stringify(s));let intentional=false,lastInteraction=Date.now();
 const hasEvents=s=>Array.isArray(s.events)&&s.events.length>0;
 const isLive=()=>{const s=readLocal()||{};return !!(s.running||(hasEvents(s)&&Number(s.clockMs||0)>0));};
 const checkpoint=()=>{try{window.bbsHardcourtCheckpoint?.()}catch{}};
 const stopStaleClock=()=>{const s=readLocal()||{};if(!s.running)return false;const now=Date.now(),last=Number(s.lastTick||0),clock=Number(s.clockMs||0);if(!last||now-last>30000||clock<=0||last>now+60000){s.running=false;s.lastTick=null;save(s);checkpoint();return true}return false};
 const prepareNavigation=()=>{intentional=true;const s=readLocal()||{};if(s.running){s.running=false;s.lastTick=null;save(s)}checkpoint();return true};
 stopStaleClock();
 window.addEventListener('beforeunload',e=>{checkpoint();if(intentional||!isLive())return;e.preventDefault();e.returnValue='';});
 document.addEventListener('click',e=>{lastInteraction=Date.now();const target=e.target?.closest?.('a[href]');if(!target)return;const href=target.getAttribute('href')||'';if(!href||href.startsWith('#')||target.target==='_blank'||target.hasAttribute('download'))return;prepareNavigation()},true);
 for(const type of ['pointerdown','keydown','touchstart'])document.addEventListener(type,()=>{lastInteraction=Date.now()},true);
 document.addEventListener('visibilitychange',()=>{const s=readLocal()||{};if(document.hidden){checkpoint();if(s.running){s.lastTick=Date.now();save(s)}}else{intentional=false;stopStaleClock()}});
 window.addEventListener('pageshow',()=>{intentional=false;stopStaleClock()});
 window.addEventListener('pagehide',()=>{const s=readLocal()||{};checkpoint();if(s.running){s.running=false;s.lastTick=null;save(s)}});
 window.addEventListener('offline',()=>{checkpoint();const s=readLocal()||{};if(s.running&&Number(s.clockMs||0)<=0){s.running=false;s.lastTick=null;save(s)}});
 window.addEventListener('online',()=>{intentional=false;stopStaleClock()});
 window.bbsPrepareHardcourtNavigation=prepareNavigation;window.bbsHardcourtSessionState=()=>({live:isLive(),lastInteraction});
 return{isLive,stopStaleClock,prepareNavigation};
}
