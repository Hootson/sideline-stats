import test from 'node:test';
import assert from 'node:assert/strict';
import {HARDCOURT_COMMERCIAL,hardcourtPriceLabel,hardcourtPlanLabel,hardcourtTrialLabel} from '../commercial-config.js';

test('launch pricing and trial stay locked to approved values',()=>{
  assert.equal(HARDCOURT_COMMERCIAL.trialDays,7);
  assert.equal(HARDCOURT_COMMERCIAL.plans.statkeeper.priceCents,1499);
  assert.equal(HARDCOURT_COMMERCIAL.plans.team_pro.priceCents,3999);
  assert.equal(HARDCOURT_COMMERCIAL.plans.team_pro.coachSeats,5);
  assert.equal(hardcourtPriceLabel('statkeeper'),'$14.99');
  assert.equal(hardcourtPriceLabel('team_pro'),'$39.99');
  assert.equal(hardcourtPlanLabel('statkeeper'),'Stat Keeper');
  assert.equal(hardcourtPlanLabel('team_pro'),'Team Pro');
  assert.match(hardcourtTrialLabel(),/7-Day Team Pro Trial/);
});
