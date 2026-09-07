const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync(new URL('../snap-tracker.js',`file://${__filename}`),'utf8');
const token='offline-test-token';
const gamePayload={
  team:{name:'Erie Tigers',primary:'#155f31',accent:'#f0b33b',snapMinimum:10},
  game:{opponent:'SNAP TEST',week:4,quarter:1,teamScore:0,opponentScore:0},
  snapCount:0,
  players:[{id:'player-1',jersey:'33',name:'Kallum'}],
  playerSnapCounts:{},
  expiresAt:new Date(Date.now()+48*60*60*1000).toISOString()
};

function response(body,status=200){return {ok:status>=200&&status<300,status,text:async()=>JSON.stringify(body)}}
function makeStorage(seed){
  const map=seed||new Map();
  return {map,getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
}
function boot({storage,online,fetch}){
  const elements=new Map();
  const element=id=>{
    if(!elements.has(id))elements.set(id,{textContent:'',value:'',innerHTML:'',disabled:false,listeners:{},classList:{add(){},remove(){},toggle(){}},focus(){},select(){},setSelectionRange(){},addEventListener(type,fn){this.listeners[type]=fn}});
    return elements.get(id);
  };
  const onlineListeners=[];
  const context={
    URLSearchParams,Date,JSON,Math,Set,Object,Number,String,Array,Error,Promise,
    crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},
    localStorage:storage,
    location:{search:`?token=${token}`},
    navigator:{onLine:online},
    fetch,
    console,
    document:{
      documentElement:{style:{setProperty(){}}},
      querySelector:selector=>element(selector),
      querySelectorAll:()=>[]
    },
    window:{addEventListener(type,fn){if(type==='online')onlineListeners.push(fn)}},
    setInterval(){return 1},
    setTimeout(){return 1}
  };
  vm.runInNewContext(source,context,{filename:'snap-tracker.js'});
  return {elements,onlineListeners,context};
}
async function settle(){for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve))}

test('first online load caches the roster and enables recording',async()=>{
  const storage=makeStorage();
  const app=boot({storage,online:true,fetch:async()=>response(gamePayload)});
  await settle();
  const cached=JSON.parse(storage.getItem(`sidelineSnapGame:${token}`));
  assert.equal(cached.team.name,'Erie Tigers');
  assert.equal(cached.players.length,1);
  assert.equal(app.elements.get('#recordSnap').disabled,false);
});

test('offline reopen restores cached roster and queues a snap',async()=>{
  const storage=makeStorage();
  boot({storage,online:true,fetch:async()=>response(gamePayload)});
  await settle();

  const app=boot({storage,online:false,fetch:async()=>{throw new TypeError('offline')}});
  await settle();
  assert.match(app.elements.get('#message').textContent,/Offline copy loaded/);
  assert.equal(app.elements.get('#recordSnap').disabled,false);
  await app.elements.get('#recordSnap').listeners.click();
  const queue=JSON.parse(storage.getItem(`sidelineSnapQueue:${token}`));
  const cached=JSON.parse(storage.getItem(`sidelineSnapGame:${token}`));
  assert.equal(queue.length,1);
  assert.deepEqual(queue[0].playerIds,['player-1']);
  assert.equal(cached.playerSnapCounts['player-1'],1);
});

test('reconnection uploads the queued snap once and clears the queue',async()=>{
  const storage=makeStorage();
  boot({storage,online:true,fetch:async()=>response(gamePayload)});
  await settle();
  const offline=boot({storage,online:false,fetch:async()=>{throw new TypeError('offline')}});
  await settle();
  await offline.elements.get('#recordSnap').listeners.click();

  let submitted=0;
  const reconnectPayload=()=>({...gamePayload,snapCount:submitted,playerSnapCounts:submitted?{'player-1':1}:{}});
  boot({storage,online:true,fetch:async url=>{
    if(url.includes('submit_snap_tracker_event')){submitted++;return response({duplicate:false})}
    return response(reconnectPayload());
  }});
  await settle();
  assert.equal(submitted,1);
  assert.equal(JSON.parse(storage.getItem(`sidelineSnapQueue:${token}`)).length,0);
  assert.equal(JSON.parse(storage.getItem(`sidelineSnapGame:${token}`)).playerSnapCounts['player-1'],1);
});

test('an expired cached invitation cannot record offline',async()=>{
  const storage=makeStorage();
  storage.setItem(`sidelineSnapGame:${token}`,JSON.stringify({...gamePayload,expiresAt:new Date(Date.now()-1000).toISOString()}));
  const app=boot({storage,online:false,fetch:async()=>{throw new TypeError('offline')}});
  await settle();
  assert.equal(storage.getItem(`sidelineSnapGame:${token}`),null);
  assert.equal(app.elements.get('#recordSnap').disabled,true);
});

test('a server-rejected link disables a previously cached tracker',async()=>{
  const storage=makeStorage();
  storage.setItem(`sidelineSnapGame:${token}`,JSON.stringify(gamePayload));
  const app=boot({storage,online:true,fetch:async()=>response({message:'Snap tracker link is invalid or expired'},400)});
  await settle();
  assert.equal(app.elements.get('#recordSnap').disabled,true);
  assert.match(app.elements.get('#message').textContent,/invalid or expired/);
});

test('offline shell and 48-hour invite wiring remain enabled',()=>{
  const worker=fs.readFileSync(new URL('../service-worker.js',`file://${__filename}`),'utf8');
  const app=fs.readFileSync(new URL('../app.js',`file://${__filename}`),'utf8');
  const html=fs.readFileSync(new URL('../snap-tracker.html',`file://${__filename}`),'utf8');
  assert.match(worker,/endsWith\('\/snap-tracker\.html'\)/);
  assert.match(worker,/caches\.match\('\.\/snap-tracker\.html'\)/);
  assert.match(app,/p_expires_hours:48/);
  assert.match(html,/src="\.\/pwa\.js"/);
});

test('service worker serves the Snap Tracker shell for an offline token URL',async()=>{
  const worker=fs.readFileSync(new URL('../service-worker.js',`file://${__filename}`),'utf8');
  const listeners={};
  const cachedShell={name:'snap-shell'};
  const context={
    URL,
    fetch:async()=>{throw new TypeError('offline')},
    caches:{
      match:async request=>request==='./snap-tracker.html'?cachedShell:null,
      open:async()=>({addAll:async()=>{},put:async()=>{}}),
      keys:async()=>[]
    },
    self:{location:{origin:'https://hootson.github.io'},addEventListener:(type,fn)=>{listeners[type]=fn},skipWaiting:async()=>{},clients:{claim:async()=>{}}},
    Promise
  };
  vm.runInNewContext(worker,context,{filename:'service-worker.js'});
  let responsePromise;
  listeners.fetch({request:{method:'GET',url:'https://hootson.github.io/sideline-stats/snap-tracker.html?token=abc'},respondWith:p=>{responsePromise=p}});
  assert.equal(await responsePromise,cachedShell);
});
