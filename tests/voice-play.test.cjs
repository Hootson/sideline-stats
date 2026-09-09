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

test('maps every spelled number from zero through ninety-nine to its digit',()=>{
  for(let n=0;n<=99;n++)assert.equal(voice.spokenNumber(voice.NUMBER_WORDS[n]),n,`${voice.NUMBER_WORDS[n]} should equal ${n}`);
});

test('matches every spelled jersey number from zero through ninety-nine',()=>{
  for(let n=0;n<=99;n++){
    const players=[{id:`p${n}`,jersey:String(n),name:`Player ${n}`}];
    const found=voice.playerMentions(`pass by number ${voice.NUMBER_WORDS[n]}`,players);
    assert.equal(found[0]?.player.id,`p${n}`,`number ${voice.NUMBER_WORDS[n]} should match jersey ${n}`);
  }
});

test('normalizes common jersey-number homophones only in a jersey reference',()=>{
  const found=voice.playerMentions('number for with the pass to jersey too',roster);
  assert.deepEqual(found.map(x=>x.player.id),['abe']);
  assert.equal(voice.canonicalizeJerseyReferences('number for and jersey too'),'number 4 and jersey 2');
});

test('does not mistake pass from a player for a spoken starting field position',()=>{
  const r=voice.interpretVoiceCommand('Pass from number four to number 12 to their 22 yard line for a completed pass',roster,{possession:'ours',ballSpot:75,teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(r.ok,true);assert.equal(r.flow.player,'abe');assert.equal(r.flow.player2,'receiver');assert.equal(r.flow.startSpot,75);assert.equal(r.flow.endSpot,78);assert.equal(r.flow.yards,3);assert.equal(r.conflict,undefined);
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

test('recognizes our/their speech-to-text homophones only as field-side words',()=>{
  const offense=voice.interpretVoiceCommand('Number four runs to are 31',roster,{possession:'ours',ballSpot:25,teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(offense.ok,true);assert.equal(offense.flow.endSpot,31);assert.equal(offense.flow.yards,6);
  const defense=voice.interpretVoiceCommand('There 25 run tackled by number 33 at there 36',roster,{possession:'opp',teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(defense.ok,true);assert.equal(defense.flow.endSpot,64);assert.equal(defense.flow.yards,11);
});
