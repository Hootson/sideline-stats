import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrateHardcourtState} from '../account-flow.js';
import {HARDCOURT_COMMERCIAL,hardcourtRequiresCheckout} from '../commercial-config.js';

test('Hardcourt preview never requires checkout',()=>{
  assert.equal(HARDCOURT_COMMERCIAL.paidAccessEnabled,false);
  assert.equal(hardcourtRequiresCheckout(),false);
});

test('cloud team hydrates persistent Hardcourt state',()=>{
  const state={team:'Local Team',grade:'',primary:'#000000',accent:'#ffffff'};
  hydrateHardcourtState(state,{
    teamId:'team-cloud-1',seasonId:'season-cloud-1',teamName:'Erie Tigers',grade:'5th',primary:'#111111',accent:'#f58220',logo:'logo-data'
  });
  assert.equal(state.cloudTeamId,'team-cloud-1');
  assert.equal(state.cloudSeasonId,'season-cloud-1');
  assert.equal(state.team,'Erie Tigers');
  assert.equal(state.grade,'5th');
  assert.equal(state.primary,'#111111');
  assert.equal(state.accent,'#f58220');
  assert.equal(state.teamLogo,'logo-data');
});
