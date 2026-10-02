const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');

test('voice punt returns change possession and sync as turnovers',()=>{
  assert.match(app,/p\.type==="Special"&&p\.sub==="Punt Return"&&\(p\.opponentPunt\|\|st\.possession==="opp"\)\)return \{possession:"ours",down:1,distance:10\}/);
  assert.match(app,/p\.opponentPunt\|\|p\.interceptionPlayerId/);
});

test('punt outcomes remain visible and exportable',()=>{
  assert.match(app,/opponent return \$\{Math\.abs\(Number\(p\.opponentReturnYards\)/);
  assert.match(app,/PuntReturned:p\.type==="Punt"/);
  assert.match(app,/OpponentReturnYards:p\.type==="Punt"/);
});
