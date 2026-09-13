const CACHE='sideline-stats-v4-5-30-snap-history-runtime-fix-2';
const ASSETS=['./','./index.html','./styles.css','./field-position.js','./voice-play.js','./coach-analytics.js','./commercial-access.js','./pwa.js','./brand-header.png','./brand-field.png','./icon.png','./snap-tracker.html','./snap-tracker.js','./parent-viewer.html','./parent-viewer.js'];

function patchAppJs(src){
  // Completed games intentionally have no activeGameId. The Snap tab still needs
  // a game context so historical snaps remain viewable after cloud refresh.
  src=src.replace(
    'function currentGameSnapCount(playerId){\n  const g=currentGame();',
    'function snapViewGame(){return currentGame()||selectedStatsGame()||latestGame()}\nfunction currentGameSnapCount(playerId){\n  const g=snapViewGame();'
  );
  src=src.replace(
    'const gameTotal=currentGame()?.snapRecords?.length||0;',
    'const snapGame=snapViewGame();const gameTotal=snapGame?.snapRecords?.length||0;$("#recordSnapBtn").disabled=!currentGame()||currentGame()?.status==="complete";'
  );
  src=src.replace(
    'const g=currentGame();const total=g&&Array.isArray(g.snapRecords)?g.snapRecords.length:0;',
    'const g=snapViewGame();const total=g&&Array.isArray(g.snapRecords)?g.snapRecords.length:0;'
  );

  // Reconcile an edited snap in place. Do not deactivate it and create another
  // row with the same game/snap number.
  src=src.replace(
    'else{\n    const {error}=await SB.from("snap_events").update({active:false}).eq("id",id);if(error)throw error;\n    id=await createCloudSnapEvent(payload,cloudGameId);S.cloud.snapIds[r.id]=id;\n  }',
    'else{\n    const {error}=await SB.from("snap_events").update({snap_number:payload.snap_number||1,quarter:payload.quarter,client_created_at:payload.client_created_at,active:true}).eq("id",id);if(error)throw error;\n    const {error:de}=await SB.from("snap_participants").delete().eq("snap_event_id",id);if(de)throw de;\n    for(const localPid of payload.playerIds){const playerId=S.cloud.playerIds?.[localPid];if(!playerId)continue;const {error:pe}=await SB.from("snap_participants").insert({snap_event_id:id,player_id:playerId});if(pe)throw pe}\n  }'
  );
  return src;
}

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/app.js')){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(async res=>{
      const text=patchAppJs(await res.text());
      const patched=new Response(text,{status:res.status,statusText:res.statusText,headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache'}});
      const copy=patched.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return patched;
    }).catch(async()=>{const cached=await caches.match(event.request);if(!cached)return caches.match('./index.html');const text=patchAppJs(await cached.text());return new Response(text,{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache'}})}));
    return;
  }
  event.respondWith(fetch(event.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return res}).catch(async()=>{
    const exact=await caches.match(event.request);if(exact)return exact;
    if(url.pathname.endsWith('/snap-tracker.html'))return caches.match('./snap-tracker.html');
    if(url.pathname.endsWith('/parent-viewer.html'))return caches.match('./parent-viewer.html');
    return caches.match('./index.html');
  }));
});
