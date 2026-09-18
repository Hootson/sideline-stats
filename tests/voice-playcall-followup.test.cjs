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

test('recognizes called-play wording at the beginning or end of a play',()=>{
  const examples=[
    ['Coach called play number two which was a pass',2],
    ['Play call number seven was a rush',7],
    ['Play called was number 10 and Abe ran',10],
    ['Play number 20 was called and then we passed',20],
    ['Abe ran for six yards called play number five',5],
    ['Abe ran for six yards and that was play seven',7],
    ['We ran play number nine and gained six yards',9]
  ];
  for(const [spoken,number] of examples)assert.deepEqual(voice.extractPlayCall(spoken),{number:String(number)},spoken);
});

test('never treats the called-play number as a quarterback or receiver',()=>{
  const players=[
    {id:'liam',jersey:'2',name:'Liam'},
    {id:'abe',jersey:'4',name:'Abe'},
    {id:'easton',jersey:'20',name:'Easton'},
    {id:'receiver18',jersey:'18',name:'Receiver Eighteen'},
    {id:'receiver28',jersey:'28',name:'Receiver Twenty Eight'}
  ];
  const context={possession:'ours',ballSpot:75,teamName:'Erie Tigers',opponentName:'Chiefs'};
  const beginning=voice.interpretVoiceCommand('Coach called play number two which was a pass from number four to number 28 to their 20 yard line',players,context);
  assert.equal(beginning.ok,true);assert.deepEqual(beginning.flow.playCall,{number:'2'});assert.equal(beginning.flow.player,'abe');assert.equal(beginning.flow.player2,'receiver28');
  const priorExample=voice.interpretVoiceCommand('Play number 20 was called and it was a pass play from number four to number 18 to their 15 yard line',players,context);
  assert.equal(priorExample.ok,true);assert.deepEqual(priorExample.flow.playCall,{number:'20'});assert.equal(priorExample.flow.player,'abe');assert.equal(priorExample.flow.player2,'receiver18');
  const ending=voice.interpretVoiceCommand('Pass from number four to number 28 to their 20 yard line and that was play number two',players,context);
  assert.equal(ending.ok,true);assert.deepEqual(ending.flow.playCall,{number:'2'});assert.equal(ending.flow.player,'abe');assert.equal(ending.flow.player2,'receiver28');
});

test('keeps a called-play number separate from a runner at either sentence position',()=>{
  const players=[{id:'play7',jersey:'7',name:'Seven'},{id:'cohen',jersey:'12',name:'Cohen'}];
  const context={possession:'ours',ballSpot:75,teamName:'Erie Tigers',opponentName:'Chiefs'};
  for(const spoken of [
    'Play call number seven as a rush up the middle by number 12 to their 20 yard line',
    'Number 12 rushed up the middle to their 20 yard line and that was play number seven'
  ]){
    const result=voice.interpretVoiceCommand(spoken,players,context);
    assert.equal(result.ok,true,spoken);assert.deepEqual(result.flow.playCall,{number:'7'},spoken);assert.equal(result.flow.player,'cohen',spoken);assert.equal(result.flow.yards,5,spoken);
  }
});
