const test=require('node:test');
const assert=require('node:assert/strict');
const voice=require('../voice-play.js');

const roster=[
  {id:'abe',jersey:'4',name:'Abe'},
  {id:'receiver',jersey:'12',name:'Cohen'},
  {id:'defender23',jersey:'23',name:'Micah'},
  {id:'defender',jersey:'33',name:'Kallum'},
  {id:'defender99',jersey:'99',name:'Beckham'},
  {id:'returner22',jersey:'22',name:'Mason'},
  {id:'defender18',jersey:'18',name:'Easton'},
  {id:'runner42',jersey:'42',name:'Connor'},
  {id:'defender94',jersey:'94',name:'Roczen'}
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

test('recognizes a quarterback was sacked and a trailing yard loss',()=>{
  const r=voice.interpretVoiceCommand('Quarterback dropped back for a pass and was sacked by number 23 for a six-yard loss',roster,{possession:'opp',ballSpot:50,teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(r.ok,true);assert.equal(r.flow.type,'Defense');assert.equal(r.flow.sub,'Sack');assert.equal(r.flow.yards,-6);assert.deepEqual(r.flow.tacklerIds,['defender23']);
});

test('separates a forced fumble, recovery, and return from completion yards',()=>{
  const spoken='Path play and the quarterback dropped back completed the pass but was tackled by number 23 that forced the fumble and there was a fumble recovery by number four for return of 20 yards';
  const missing=voice.interpretVoiceCommand(spoken,roster,{possession:'opp',ballSpot:50,teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(missing.ok,false);assert.equal(missing.missing,'endSpot');assert.deepEqual(missing.partial.tacklerIds,['defender23']);assert.equal(missing.partial.forcedFumblePlayerId,'defender23');assert.equal(missing.partial.fumbleRecoveryPlayerId,'abe');assert.equal(missing.partial.returnYards,20);
  const r=voice.interpretVoiceCommand(`${spoken} and the return ended at their 40`,roster,{possession:'opp',ballSpot:50,teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(r.ok,true);assert.equal(r.flow.sub,'Complete Pass');assert.equal(r.flow.yards,10);assert.deepEqual(r.flow.tacklerIds,['defender23']);assert.equal(r.flow.forcedFumblePlayerId,'defender23');assert.equal(r.flow.fumbleRecoveryPlayerId,'abe');assert.equal(r.flow.returnYards,20);assert.equal(r.flow.endSpot,60);
});

test('infers the tackler forced a fumble and applies number-before-return yardage',()=>{
  const spoken='Quarterback dropped back and completed the pass at their 35 yard line and got tackled by number 99 but there was a fumble on the play and it was recovered by number four for a 15 yard return';
  const r=voice.interpretVoiceCommand(spoken,roster,{possession:'opp',ballSpot:75,teamName:'Erie Tigers',opponentName:'Chiefs'});
  assert.equal(r.ok,true);assert.equal(r.flow.sub,'Complete Pass');assert.equal(r.flow.yards,10);assert.deepEqual(r.flow.tacklerIds,['defender99']);assert.equal(r.flow.forcedFumblePlayerId,'defender99');assert.equal(r.flow.fumbleRecoveryPlayerId,'abe');assert.equal(r.flow.returnYards,15);assert.equal(r.flow.endSpot,80);
});

test('recognizes picked off language and assigns interception return roles',()=>{
  const byPlayer=voice.interpretVoiceCommand('Pass was picked off by number four at their 35 and returned 15 yards',roster,{possession:'opp',ballSpot:75,teamName:'Erie Tigers',opponentName:'Chiefs'});
  assert.equal(byPlayer.ok,true);assert.equal(byPlayer.flow.sub,'INT');assert.equal(byPlayer.flow.interceptionPlayerId,'abe');assert.equal(byPlayer.flow.returnYards,15);assert.equal(byPlayer.flow.endSpot,80);assert.deepEqual(byPlayer.flow.tacklerIds,[]);
  const playerFirst=voice.interpretVoiceCommand('Number four picked it off at their 35 and ran it back for 15 yards',roster,{possession:'opp',ballSpot:75,teamName:'Erie Tigers',opponentName:'Chiefs'});
  assert.equal(playerFirst.ok,true);assert.equal(playerFirst.flow.interceptionPlayerId,'abe');assert.equal(playerFirst.flow.returnYards,15);assert.equal(playerFirst.flow.endSpot,80);
});

test('records pick six and other defensive interception touchdown language',()=>{
  for(const spoken of ['Pick six by number four','Number four intercepted the pass and took it to the house']){
    const r=voice.interpretVoiceCommand(spoken,roster,{possession:'opp',ballSpot:75,teamName:'Erie Tigers',opponentName:'Chiefs'});
    assert.equal(r.ok,true,spoken);assert.equal(r.flow.sub,'INT',spoken);assert.equal(r.flow.interceptionPlayerId,'abe',spoken);assert.equal(r.flow.defensiveTouchdownPlayerId,'abe',spoken);assert.equal(r.flow.endSpot,100,spoken);assert.deepEqual(r.flow.extras,[],spoken);
  }
});

test('asks who made a bare picked interception while preserving its spot',()=>{
  const r=voice.interpretVoiceCommand('The pass was picked at their 35',roster,{possession:'opp',ballSpot:75,teamName:'Erie Tigers',opponentName:'Chiefs'});
  assert.equal(r.ok,false);assert.equal(r.missing,'interceptor');assert.equal(r.partial.endSpot,65);assert.equal(r.partial.interception,true);
});

test('records an opponent punt return with possession, returner, yards, and final spot',()=>{
  const r=voice.interpretVoiceCommand('They punted on 4th down and we returned for about 10 yards to our 17 yard line by number 22',roster,{possession:'opp',ballSpot:60,teamName:'Erie Tigers',opponentName:'Chiefs'});
  assert.equal(r.ok,true);assert.equal(r.flow.type,'Special');assert.equal(r.flow.sub,'Punt Return');assert.equal(r.flow.opponentPunt,true);assert.equal(r.flow.player,'returner22');assert.equal(r.flow.yards,10);assert.equal(r.flow.startSpot,7);assert.equal(r.flow.endSpot,17);
});

test('records our punter, punt distance, opponent return, final spot, and turnover',()=>{
  const r=voice.interpretVoiceCommand('On fourth down number four punted it 50 yards and they returned it for 10 yards to their 35 yard line',roster,{possession:'ours',ballSpot:25,teamName:'Erie Tigers',opponentName:'Chiefs'});
  assert.equal(r.ok,true);assert.equal(r.flow.type,'Punt');assert.equal(r.flow.player,'abe');assert.equal(r.flow.yards,50);assert.equal(r.flow.puntReturned,true);assert.equal(r.flow.opponentReturnYards,10);assert.equal(r.flow.startSpot,25);assert.equal(r.flow.endSpot,65);
});

test('records an opponent punt with no return without inventing a returner',()=>{
  const r=voice.interpretVoiceCommand('They punted and the ball was downed at our 17 yard line',roster,{possession:'opp',ballSpot:60,teamName:'Erie Tigers',opponentName:'Chiefs'});
  assert.equal(r.ok,true);assert.equal(r.flow.type,'Punt');assert.equal(r.flow.sub,'Opponent Punt');assert.equal(r.flow.player,null);assert.equal(r.flow.puntReturned,false);assert.equal(r.flow.endSpot,17);
});

test('recognizes our/their speech-to-text homophones only as field-side words',()=>{
  const offense=voice.interpretVoiceCommand('Number four runs to are 31',roster,{possession:'ours',ballSpot:25,teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(offense.ok,true);assert.equal(offense.flow.endSpot,31);assert.equal(offense.flow.yards,6);
  const defense=voice.interpretVoiceCommand('There 25 run tackled by number 33 at there 36',roster,{possession:'opp',teamName:'Erie Tigers',opponentName:'Falcons'});
  assert.equal(defense.ok,true);assert.equal(defense.flow.endSpot,64);assert.equal(defense.flow.yards,11);
});

test('records an offensive fumble and reversed called-play wording',()=>{
  const r=voice.interpretVoiceCommand('Play 15 called a rush for number 42 and he fumbled on their 20 yard line',roster,{possession:'ours',ballSpot:85,teamName:'Erie Tigers',opponentName:'Chiefs'});
  assert.equal(r.ok,true);assert.deepEqual(r.flow.playCall,{number:'15'});assert.equal(r.flow.player,'runner42');assert.equal(r.flow.yards,-5);assert.deepEqual(r.flow.extras,['Fumble']);
});

test('tolerates brush for rush and credits every named tackler',()=>{
  const r=voice.interpretVoiceCommand('Brush the outside for 4 yard game tackled by number 42 number four number 18',roster,{possession:'opp',ballSpot:18,teamName:'Erie Tigers',opponentName:'Chiefs'});
  assert.equal(r.ok,true);assert.equal(r.flow.sub,'Opponent Run');assert.equal(r.flow.yards,4);assert.deepEqual(r.flow.tacklerIds,['runner42','abe','defender18']);
});

test('tolerates fourth fumble and gives the forcing tackler both credits',()=>{
  const r=voice.interpretVoiceCommand('Hey rush up the middle for a 4 yard game but there was a fourth fumble by number 99 and recovered by number 23',roster,{possession:'opp',ballSpot:18,teamName:'Erie Tigers',opponentName:'Chiefs'});
  assert.equal(r.ok,true);assert.equal(r.flow.sub,'Opponent Run');assert.equal(r.flow.yards,4);assert.deepEqual(r.flow.tacklerIds,['defender99']);assert.equal(r.flow.forcedFumblePlayerId,'defender99');assert.equal(r.flow.fumbleRecoveryPlayerId,'defender23');
});

test('credits a batted incomplete pass as a pass defended, not a tackle',()=>{
  const r=voice.interpretVoiceCommand('Pass play incomplete battered down by number 23',roster,{possession:'opp',ballSpot:14,teamName:'Erie Tigers',opponentName:'Chiefs'});
  assert.equal(r.ok,true);assert.equal(r.flow.sub,'Incomplete Pass');assert.deepEqual(r.flow.tacklerIds,[]);assert.equal(r.flow.passDefendedPlayerId,'defender23');assert.match(r.summary,/PD #23/);
});

test('uses turnover context to repair a badly transcribed interception',()=>{
  const r=voice.interpretVoiceCommand('Pacifier Exception at their 35 yard line returned 10 yards by number 94 pass',roster,{possession:'opp',ballSpot:14,teamName:'Erie Tigers',opponentName:'Chiefs'});
  assert.equal(r.ok,true);assert.equal(r.flow.sub,'INT');assert.equal(r.flow.interceptionPlayerId,'defender94');assert.equal(r.flow.returnYards,10);assert.equal(r.flow.endSpot,75);assert.deepEqual(r.flow.tacklerIds,[]);
});

test('understands forced to fumble and player-before-recovery wording',()=>{
  const spoken='Run for a 2 yard game tackled by number 99 that forced to fumble and number four had a fumble recovery for a 10 yard return';
  const r=voice.interpretVoiceCommand(spoken,roster,{possession:'opp',ballSpot:19,teamName:'Erie Tigers',opponentName:'Chiefs'});
  assert.equal(r.ok,true);assert.equal(r.flow.sub,'Opponent Run');assert.equal(r.flow.yards,2);assert.deepEqual(r.flow.tacklerIds,['defender99']);assert.equal(r.flow.forcedFumblePlayerId,'defender99');assert.equal(r.flow.fumbleRecoveryPlayerId,'abe');assert.equal(r.flow.returnYards,10);assert.equal(r.flow.endSpot,27);assert.match(r.summary,/FF #99 Beckham/);assert.match(r.summary,/FR #4 Abe/);assert.match(r.summary,/Erie Tigers 19 → Erie Tigers 27/);
});
