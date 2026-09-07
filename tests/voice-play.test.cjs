const test=require('node:test');
const assert=require('node:assert/strict');
const voice=require('../voice-play.js');

const roster=[
  {id:'abe',jersey:'4',name:'Abe'},
  {id:'receiver',jersey:'12',name:'Cohen'},
  {id:'defender',jersey:'33',name:'Kallum'}
];

test('corrects Babe to rostered player Abe and calculates a rush',()=>{
  const r=voice.interpretVoiceCommand('Own 25, Babe with the run to our 31',roster,{possession:'ours',teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(r.ok,true);assert.equal(r.flow.player,'abe');assert.equal(r.flow.yards,6);
});

test('calculates a completed pass from spoken field positions',()=>{
  const r=voice.interpretVoiceCommand('Abe with the pass attempt to number 12 starting at our 15 and getting tackled at the 50 yard line',roster,{possession:'ours',teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(r.ok,true);assert.equal(r.flow.sub,'Complete');assert.equal(r.flow.player,'abe');assert.equal(r.flow.player2,'receiver');assert.equal(r.flow.yards,35);
});

test('recognizes spelled-out and digit jersey numbers',()=>{
  const words=voice.interpretVoiceCommand('Number four with a complete pass to jersey twelve at their 35 yard line',roster,{possession:'ours',ballSpot:25,teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(words.ok,true);assert.equal(words.flow.player,'abe');assert.equal(words.flow.player2,'receiver');assert.equal(words.flow.yards,40);
  const digits=voice.interpretVoiceCommand('#4 complete pass to number 12 at their 35 yard line',roster,{possession:'ours',ballSpot:25,teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(digits.ok,true);assert.equal(digits.flow.player,'abe');assert.equal(digits.flow.player2,'receiver');
});

test('applies a saved team speech correction',()=>{
  const r=voice.interpretVoiceCommand('Babe with the run to our 31',roster,{possession:'ours',ballSpot:25,teamName:'Erie Tigers',opponentName:'Falcons',voiceCorrections:{babe:'abe'}});
  assert.equal(r.ok,true);assert.equal(r.flow.player,'abe');assert.equal(r.flow.yards,6);
});

test('asks for a missing drive start',()=>{
  const r=voice.interpretVoiceCommand('Abe runs to our 31',roster,{possession:'ours',ballSpot:null,teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(r.ok,false);assert.equal(r.missing,'startSpot');
});

test('uses known drive location when only ending location is spoken',()=>{
  const r=voice.interpretVoiceCommand('Abe runs to our 36',roster,{possession:'ours',ballSpot:25,teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(r.ok,true);assert.equal(r.flow.yards,11);
});

test('flags an explicitly spoken start that conflicts with the current spot',()=>{
  const r=voice.interpretVoiceCommand('From our 20 Abe runs to our 30',roster,{possession:'ours',ballSpot:25,teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(r.ok,true);assert.deepEqual(r.conflict,{spoken:20,current:25});assert.equal(r.flow.yards,10);
});

test('calculates opponent run and credits a defender',()=>{
  const r=voice.interpretVoiceCommand('Their 25 run tackled by Kallum at their 36',roster,{possession:'opp',teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(r.ok,true);assert.equal(r.flow.sub,'Opponent Run');assert.equal(r.flow.yards,11);assert.deepEqual(r.flow.tacklerIds,['defender']);
});

test('calculates an opponent sack as a loss',()=>{
  const r=voice.interpretVoiceCommand('Sack by number 33 from their 30 to their 22',roster,{possession:'opp',teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(r.ok,true);assert.equal(r.flow.sub,'Sack');assert.equal(r.flow.yards,-8);
});
