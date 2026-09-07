const test=require('node:test');
const assert=require('node:assert/strict');
const field=require('../field-position.js');

test('converts fixed team and opponent sides to one field coordinate',()=>{
  assert.equal(field.spotFromSide('ours',25,'ours'),25);
  assert.equal(field.spotFromSide('opp',36,'ours'),64);
  assert.equal(field.spotFromSide('midfield',0,'ours'),50);
});

test('calculates offense gains, crossings, and losses',()=>{
  assert.equal(field.yardsBetween(25,36,'ours'),11);
  assert.equal(field.yardsBetween(40,65,'ours'),25);
  assert.equal(field.yardsBetween(80,75,'ours'),-5);
});

test('calculates opponent gains in the reverse direction',()=>{
  assert.equal(field.yardsBetween(75,64,'opp'),11);
  assert.equal(field.yardsBetween(60,45,'opp'),15);
  assert.equal(field.yardsBetween(70,78,'opp'),-8);
});

test('advances field position when manual yards are used',()=>{
  assert.equal(field.advanceSpot(25,11,'ours'),36);
  assert.equal(field.advanceSpot(75,11,'opp'),64);
});
