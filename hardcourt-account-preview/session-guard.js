// Protects a live stat-keeping session from accidental navigation/reload and stale clock state.
export function installHardcourtSessionGuard({readLocal=()=>({})}={}){
 const KEY='hardcourt-alpha',save=s=>localStorage.setItem(KEY,JSON.stringify(s));let intentional=false,lastInteraction=Date.now(),hiddenAt=0;
 const hasEvents=s=>Array.isArray(s.events)&&s.events.length>0;
 const isLive=()=>{const s=readLocal()||{};return !!(s.running||hasEvents(s));};
 const checkpoint=()=>{try{window.bbsHardcourtCheckpoint?.()}catch{}};
 const stopClock=(s=readLocal()||{})=>{if(!s.running)return false;s.running=false;s.lastTick=null;save(s);checkpoint();return true};
 const stopStaleClock=()=>{const s=readLocal()||{};if(!s.running)return false;const now=Date.now(),last=Number(s.lastTick||0),clock=Number(s.clockMs||0);if(!last||now-last>30000||clock<=0||last>now+60000)return stopClock(s);return false};
 const prepareNavigation=()=>{intentional=true;checkpoint();stopClock();return true};
 stopStaleClock();
 window.addEventListener('beforeunload',e=>{checkpoint();if(intentional||!isLive())return;e.preventDefault();e.returnValue='';});
 document.addEventListener('click',e=>{lastInteraction=Date.now();const target=e.target?.closest?.('a[href]');if(!target)return;const href=target.getAttribute('href')||'';if(!href||href.startsWith('#')||target.target==='_blank'||target.hasAttribute('download'))return;prepareNavigation()},true);
 for(const type of ['pointerdown','keydown','touchstart'])document.addEventListener(type,()=>{lastInteraction=Date.now()},true);
 document.addEventListener('visibilitychange',()=>{const s=readLocal()||{};if(document.hidden){hiddenAt=Date.now();checkpoint();if(s.running){s.lastTick=Date.now();save(s)}}else{intentional=false;const away=hiddenAt?Date.now()-hiddenAt:0;hiddenAt=0;if(away>30000)stopClock();else stopStaleClock()}});
 window.addEventListener('pageshow',e=>{intentional=false;if(e.persisted)stopClock();else stopStaleClock()});
 window.addEventListener('pagehide',()=>{checkpoint();stopClock()});
 window.addEventListener('offline',()=>{checkpoint();const s=readLocal()||{};if(s.running&&Number(s.clockMs||0)<=0)stopClock(s)});
 window.addEventListener('online',()=>{intentional=false;stopStaleClock()});
 window.bbsPrepareHardcourtNavigation=prepareNavigation;window.bbsHardcourtSessionState=()=>{const s=readLocal()||{};return{live:isLive(),running:!!s.running,lastInteraction}};
 return{isLive,stopStaleClock,prepareNavigation};
}
