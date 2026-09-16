const test=require('node:test');
const assert=require('node:assert/strict');
const voice=require('../voice-play.js');
const roster=[{id:'abe',jersey:'4',name:'Abe'}];
const ctx={possession:'ours',ballSpot:25,teamName:'Erie Tigers',opponentName:'Chiefs'};

test('extracts common spoken called-play phrases',()=>{
  assert.deepEqual(voice.extractPlayCall('we called play number five then Abe ran for 6 yards'),{number:'5'});
  assert.deepEqual(voice.extractPlayCall('the play called was number 10 and Abe ran for 6 yards'),{number:'10'});
  assert.deepEqual(voice.extractPlayCall('called play 12 Abe runs for 4 yards'),{number:'12'});
});

test('attaches spoken called play to a parsed offensive flow',()=>{
  const r=voice.interpretVoiceCommand('we called play number five Abe runs for 6 yards',roster,ctx);
  assert.equal(r.ok,true);
  assert.deepEqual(r.flow.playCall,{number:'5'});
  assert.match(r.summary,/Called play 5/);
});

test('does not mistake jersey number for called play',()=>{
  assert.equal(voice.extractPlayCall('number four runs for 6 yards'),null);
});
