const CACHE='sideline-stats-v4-5-35-field-voice-fixes';
const ASSETS=['./','./index.html','./styles.css','./voice-followup.css','./followup-loader.js','./app.js','./field-position.js','./field-orientation.js','./cloud-conflict.js','./game-lifecycle.js','./voice-workflow.js','./edit-play-model.js','./voice-play.js','./coach-analytics.js','./commercial-access.js','./pwa.js','./brand-header.png','./brand-field.png','./icon.png','./snap-tracker.html','./snap-tracker.js','./parent-viewer.html','./parent-viewer.js'];

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(res=>{
    const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return res;
  }).catch(async()=>{
    const exact=await caches.match(event.request);if(exact)return exact;
    if(url.pathname.endsWith('/snap-tracker.html'))return caches.match('./snap-tracker.html');
    if(url.pathname.endsWith('/parent-viewer.html'))return caches.match('./parent-viewer.html');
    return caches.match('./index.html');
  }));
});