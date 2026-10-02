const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');

test('manual takeaways calculate the return endpoint before recording',()=>{
  assert.match(app,/function showTakeawaySpotThenReturnYards\(label\)/);
  assert.match(app,/Field\.returnEndSpot\(S\.flow\.takeawaySpot,S\.flow\.returnYards,S\.flow\.returningPossession\|\|"ours"\)/);
  assert.match(app,/Opponent interception return yards","opp","record"/);
  assert.match(app,/Opponent fumble return yards","opp","record"/);
});

test('punts and possession switches always retain a calculated ball spot',()=>{
  assert.match(app,/p\.type==="Punt"\)end=Field\.puntEndSpot/);
  assert.match(app,/p\.type==="Possession Switch"\)end=start/);
  assert.match(app,/S\.flow\.type==="Punt"&&Field\.validSpot\(S\.flow\.endSpot\)===null/);
});
