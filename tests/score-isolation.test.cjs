const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');

const start=app.indexOf('function legacyPointsFromPlay');
const end=app.indexOf('function legacyAutoPoints',start);
assert.ok(start>=0&&end>start,'score functions must be present');
const scoringSource=app.slice(start,end);
const {pointsFromPlay}=new Function(`${scoringSource};return {pointsFromPlay};`)();

assert.equal(pointsFromPlay({type:'Rush',extras:['TD']}),6,'our offensive TD must add six to our score');
assert.equal(pointsFromPlay({type:'Defense',extras:['TD']}),0,'opponent offensive TD must not add to our score');
assert.equal(pointsFromPlay({type:'Defense',extras:[],defensiveTouchdownPlayerId:'player-1'}),6,'our defensive return TD must add six to our score');
assert.match(app,/g\.oppScore=n;persist\(\);renderLiveGame\(\)/,'manual opponent correction must only assign the opponent score');
assert.doesNotMatch(app,/setOppScore[\s\S]{0,300}scoreAdjustment=/,'manual opponent correction must not alter our score adjustment');
console.log('score-isolation checks passed');
