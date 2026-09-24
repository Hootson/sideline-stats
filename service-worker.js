const RELEASE='4.6.35';
const CACHE='bleacher-butt-gridiron-v4-6-35-player-card-gestures';
const ASSETS=['./','./index.html','./styles.css','./voice-followup.css','./followup-loader.js','./version.js','./cloud-pagination.js','./storage-snapshot.js','./app.js','./field-position.js','./field-orientation.js','./cloud-conflict.js','./game-lifecycle.js','./voice-workflow.js','./edit-play-model.js','./voice-play.js','./coach-analytics.js','./commercial-access.js','./owner-business.css','./owner-business.js','./pwa.js','./player-profile.js','./brand-header-gridiron.webp','./brand-field.png','./icon.png','./snap-tracker.html','./snap-tracker.js','./parent-viewer.html','./parent-viewer.js','./player-card-vintage-2.js'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of list){
      try{
        const u=new URL(client.url);
        if(u.origin!==self.location.origin)continue;
        if(u.pathname.endsWith('/parent-viewer.html')||u.pathname.endsWith('/snap-tracker.html'))continue;
        if(u.searchParams.get('ssRelease')===RELEASE)continue;
        u.searchParams.set('ssRelease',RELEASE);
        await client.navigate(u.toString());
      }catch(_){}
    }
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  const freshRequest=new Request(event.request,{cache:'no-store'});
  event.respondWith(fetch(freshRequest).then(res=>{
    const copy=res.clone();
    caches.open(CACHE).then(c=>c.put(event.request,copy));
    return res;
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
