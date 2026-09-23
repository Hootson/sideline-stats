const assert=require('assert');
const Snapshot=require('../storage-snapshot.js');

class QuotaStorage{
  constructor(limit,initial={}){this.limit=limit;this.data={...initial}}
  getItem(k){return Object.prototype.hasOwnProperty.call(this.data,k)?this.data[k]:null}
  removeItem(k){delete this.data[k]}
  setItem(k,v){
    const next={...this.data,[k]:String(v)};
    const size=Object.entries(next).reduce((n,[key,value])=>n+(key.length+value.length)*2,0);
    if(size>this.limit)throw Object.assign(new Error('Quota exceeded'),{name:'QuotaExceededError'});
    this.data=next;
  }
}

const image='data:image/jpeg;base64,'+'x'.repeat(1_500_000);
const state={team:{name:'Erie Tigers',logoData:image},roster:[{id:'4',name:'Abe'}],games:[{id:'g1',opponent:'Kindred',opponentLogoData:image,plays:[{id:'p1',type:'Run',yards:4}],snapRecords:[{id:'s1',playerIds:['4']}]}],cloud:{teamId:'t1',seasonId:'s1',gameIds:{g1:'cg1'},playIds:{p1:'cp1'},teamHash:'derived',playHashes:{p1:'derived'}}};
const prior=JSON.stringify(state);
const storage=new QuotaStorage(7_000_000,{sidelineStatsData:prior,sidelineStatsRecovery:prior});
const result=Snapshot.save(storage,'sidelineStatsData','sidelineStatsRecovery',state);
assert.equal(result.usedCompactMain,false,'primary snapshot should fit after the legacy duplicate is removed');
assert.equal(JSON.parse(storage.getItem('sidelineStatsData')).team.logoData,image,'primary snapshot keeps images when they fit');
const recovery=JSON.parse(storage.getItem('sidelineStatsRecovery'));
assert.equal(recovery.team.logoData,null,'recovery snapshot must omit embedded team images');
assert.equal(recovery.games[0].opponentLogoData,null,'recovery snapshot must omit embedded opponent images');
assert.equal(recovery.games[0].plays[0].yards,4,'recovery snapshot must preserve game data');
assert.equal(recovery.cloud.gameIds.g1,'cg1','recovery snapshot must preserve cloud record IDs');
assert.equal(recovery.cloud.playHashes,undefined,'recovery snapshot may omit rebuildable hashes');

const tight=new QuotaStorage(900_000);
const fallback=Snapshot.save(tight,'sidelineStatsData','sidelineStatsRecovery',state);
assert.equal(fallback.usedCompactMain,true,'oversized image cache should fall back to a compact primary snapshot');
const saved=JSON.parse(tight.getItem('sidelineStatsData'));
assert.equal(saved.team.name,'Erie Tigers');
assert.equal(saved.games[0].plays[0].id,'p1');
assert.equal(saved.games[0].snapRecords[0].id,'s1');
console.log('Storage snapshot regression tests passed');
