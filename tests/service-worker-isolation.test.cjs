const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const worker=fs.readFileSync(new URL('../service-worker.js',`file://${__filename}`),'utf8');

function bootWorker(cacheKeys){
  const listeners={};
  const deleted=[];
  const navigated=[];
  const context={
    URL,
    Request:class Request{constructor(request,options){this.url=request.url;this.method=request.method;this.options=options}},
    fetch:async()=>({clone(){return this}}),
    caches:{
      open:async()=>({addAll:async()=>{},put:async()=>{}}),
      keys:async()=>cacheKeys.slice(),
      delete:async key=>{deleted.push(key);return true},
      match:async()=>null
    },
    self:{
      location:{origin:'https://hootson.github.io'},
      addEventListener:(type,fn)=>{listeners[type]=fn},
      skipWaiting:async()=>{},
      clients:{
        claim:async()=>{},
        matchAll:async()=>[]
      },
      registration:{showNotification:async()=>{}}
    },
    clients:{matchAll:async()=>[],openWindow:async()=>{}},
    Promise
  };
  vm.runInNewContext(worker,context,{filename:'service-worker.js'});
  return {listeners,deleted,navigated};
}

test('Gridiron activation deletes only stale Gridiron caches',async()=>{
  const current='bleacher-butt-gridiron-v4-6-49-pwa-hardening';
  const oldGridiron='bleacher-butt-gridiron-v4-6-48-player-card-coordinate-cache';
  const hardcourt='hardcourt-ui71-20260922';
  const account='hardcourt-account-preview-20260925ba';
  const unrelated='some-other-cache';
  const app=bootWorker([current,oldGridiron,hardcourt,account,unrelated]);
  let pending;
  app.listeners.activate({waitUntil:p=>{pending=p}});
  await pending;
  assert.deepEqual(app.deleted,[oldGridiron]);
});

test('Gridiron precache explicitly includes umbrella bridge and home icon',()=>{
  assert.match(worker,/\.\/bbs-gridiron-setup\.js/);
  assert.match(worker,/\.\/bbs-gridiron-umbrella\.js/);
  assert.match(worker,/\.\/bleacher-butt-home-icon\.png/);
});

test('Snap Tracker and Parent Viewer offline shell fallbacks remain intact',()=>{
  assert.match(worker,/endsWith\('\/snap-tracker\.html'\)/);
  assert.match(worker,/caches\.match\('\.\/snap-tracker\.html'\)/);
  assert.match(worker,/endsWith\('\/parent-viewer\.html'\)/);
  assert.match(worker,/caches\.match\('\.\/parent-viewer\.html'\)/);
});
