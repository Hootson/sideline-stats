const test = require('node:test');
const assert = require('node:assert/strict');
const voice = require('../voice-play.js');

const roster = [
  {id:'cole', jersey:'12', name:'Cole'},
  {id:'cohen', jersey:'15', name:'Cohen'},
  {id:'kallum', jersey:'33', name:'Kallum'}
];

test('parses a named runner and numeric yards', () => {
  const result = voice.interpretVoiceCommand('Cohen run 15 yards', roster, {possession:'ours'});
  assert.equal(result.ok, true);
  assert.deepEqual(result.flow, {type:'Rush', player:'cohen', yards:15, extras:[]});
});

test('parses jersey number, spoken loss, and touchdown', () => {
  const result = voice.interpretVoiceCommand('number 33 rush loss of five yards touchdown', roster, {possession:'ours'});
  assert.equal(result.ok, true);
  assert.equal(result.flow.player, 'kallum');
  assert.equal(result.flow.yards, -5);
  assert.deepEqual(result.flow.extras, ['TD']);
});

test('parses a completed pass with spoken yards', () => {
  const result = voice.interpretVoiceCommand('Cole complete to Cohen for twelve yards', roster, {possession:'ours'});
  assert.equal(result.ok, true);
  assert.deepEqual(result.flow, {type:'Pass', sub:'Complete', player:'cole', player2:'cohen', yards:12, extras:[]});
});

test('parses an incomplete dropped pass', () => {
  const result = voice.interpretVoiceCommand('Cole incomplete intended for Cohen dropped', roster, {possession:'ours'});
  assert.equal(result.ok, true);
  assert.equal(result.flow.sub, 'Incomplete');
  assert.equal(result.flow.drop, true);
  assert.equal(result.flow.yards, 0);
});

test('parses an interception and leaves yardage at zero', () => {
  const result = voice.interpretVoiceCommand('Cole intercepted intended for Cohen', roster, {possession:'ours'});
  assert.equal(result.ok, true);
  assert.equal(result.flow.sub, 'Intercepted');
  assert.equal(result.flow.yards, 0);
});

test('rejects ambiguity and defensive possession', () => {
  assert.equal(voice.interpretVoiceCommand('run 15 yards', roster, {possession:'ours'}).ok, false);
  assert.equal(voice.interpretVoiceCommand('Cohen run 15 yards', roster, {possession:'opp'}).ok, false);
  assert.equal(voice.interpretVoiceCommand('Cole complete 12 yards', roster, {possession:'ours'}).ok, false);
});
