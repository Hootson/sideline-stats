const test=require('node:test');
const assert=require('node:assert/strict');
const orientation=require('../field-orientation.js');

function visualFromCanonical(spot,quarter){return orientation.visualPercent(spot,quarter)}
function canonicalFromVisual(percent,quarter){return orientation.canonicalPercent(percent,quarter)}

test('canonical field spots round-trip through every quarter orientation',()=>{
  for(const q of [1,2,3,4])for(const spot of [1,10,39,49,50,61,90,99]){
    assert.equal(canonicalFromVisual(visualFromCanonical(spot,q),q),spot,`Q${q} spot ${spot}`);
  }
});

test('quarter flip changes physical half but never team-relative canonical label',()=>{
  assert.equal(visualFromCanonical(39,1),39);
  assert.equal(visualFromCanonical(39,2),61);
  assert.equal(canonicalFromVisual(61,2),39);
});
