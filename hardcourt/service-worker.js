const CACHE="hardcourt-account-20261001-launch2";
const CORE=[
  "./","./index.html","./styles.css?v=ui53","./app.js?v=20260922-ui71","./legacy-app.js",
  "./account-gate.js","./account-flow.js","./account-integration.js","./cloud-account.js","./onboarding.js",
  "./commercial-config.js","./commerce.js","./game-cloud.js","./game-manager.js","./sharing.js","./engine.js",
  "./manifest.webmanifest?v=ui53","./court-iphone.png","./court-ipad.png","./court-analytics.png","./hardcourt-header-arena-ui71.jpg?v=ui71"
];
self.addEventListener("install",event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(const asset of CORE){try{const response=await fetch(asset,{cache:"reload"});if(!response.ok)throw new Error(`${asset}: ${response.status}`);await cache.put(asset,response.clone())}catch(error){console.warn("Hardcourt install cache miss",asset,error)}}await self.skipWaiting()})()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith("hardcourt-")&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim()})()));
self.addEventListener("message",event=>{if(event.data==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==location.origin)return;if(event.request.mode==="navigate"){event.respondWith(fetch(event.request,{cache:"no-store"}).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put("./index.html",response.clone())}return response}).catch(()=>caches.match("./index.html")));return}event.respondWith((async()=>{try{const response=await fetch(event.request,{cache:"no-store"});if(response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone())}return response}catch(error){const cached=await caches.match(event.request);if(cached)return cached;throw error}})())});
