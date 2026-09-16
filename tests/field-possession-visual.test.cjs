const test=require('node:test');
const assert=require('node:assert/strict');
require('../field-orientation.js');
const o=globalThis.SidelineFieldOrientation;
function visual(spot,poss,q){const canonical=poss==='opp'?100-spot:spot;return o.visualPercent(canonical,q)}
function underlying(percent,poss,q){const canonical=o.canonicalPercent(percent,q);return poss==='opp'?100-canonical:canonical}
test('opponent possession round-trips across quarter flips',()=>{for(const q of [1,2,3,4])for(const spot of [25,39,61,75])assert.equal(underlying(visual(spot,'opp',q),'opp',q),spot)});
test('opponent ball on our 39 is physically opposite our ball on our 39',()=>{assert.equal(visual(39,'ours',1),39);assert.equal(visual(39,'opp',1),61);assert.equal(visual(39,'ours',2),61);assert.equal(visual(39,'opp',2),39)});
