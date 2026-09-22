const CACHE="hardcourt-ui56-20260922";
const ASSETS=["./","./index.html","./styles.css?v=ui53","./app.js?v=20260922-ui56","./engine.js","./manifest.webmanifest?v=ui53","./court-iphone.png","./court-ipad.png","./court-analytics.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(async c=>{for(const asset of ASSETS){try{const r=await fetch(asset,{cache:"reload"});if(r.ok)await c.put(asset,r.clone())}catch(_){}}}).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith("hardcourt-")&&x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("message",e=>{if(e.data==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);if(u.origin!==location.origin)return;e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(async()=>await caches.match(e.request)||await caches.match("./index.html")))});
