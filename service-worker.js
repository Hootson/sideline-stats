const CACHE='sideline-stats-v4-6-6-original-header-height';
const ASSETS=['./','./index.html','./styles.css','./voice-followup.css','./followup-loader.js','./version.js','./cloud-pagination.js','./app.js','./field-position.js','./field-orientation.js','./cloud-conflict.js','./game-lifecycle.js','./voice-workflow.js','./edit-play-model.js','./voice-play.js','./coach-analytics.js','./commercial-access.js','./owner-business.css','./owner-business.js','./pwa.js','./brand-header-gridiron.webp','./brand-field.png','./icon.png','./snap-tracker.html','./snap-tracker.js','./parent-viewer.html','./parent-viewer.js'];

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

self.addEventListener('push',event=>{
  let data={};try{data=event.data?.json()||{}}catch(_){data={body:event.data?.text()||'Sideline Stats has an update.'}}
  event.waitUntil(self.registration.showNotification(data.title||'Sideline Stats',{
    body:data.body||'Open the app for details.',
    icon:'./icon.png',badge:'./icon.png',tag:data.tag||'sideline-stats-update',
    data:{url:data.url||'./'}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'./';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus' in client){client.navigate(target);return client.focus()}}
    return clients.openWindow?clients.openWindow(target):null;
  }));
});
