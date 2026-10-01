import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const read=p=>fs.readFileSync(path.join(here,'..',p),'utf8');

test('account bootstrap uses the shared Hardcourt local state and current modules',()=>{
  const app=read('app.js');
  assert.match(app,/STORAGE_KEY='hardcourt-alpha'/);
  assert.match(app,/createHardcourtCommerce/);
  assert.match(app,/installHardcourtGameManager/);
  assert.match(app,/createHardcourtSharing/);
  assert.match(app,/runHardcourtOnboarding/);
});

test('checkout calls the production Stripe function and identifies Hardcourt',()=>{
  const commerce=read('commerce.js');
  assert.match(commerce,/create-stripe-checkout/);
  assert.match(commerce,/edition:'hardcourt'/);
  assert.match(commerce,/checkout-status/);
  assert.match(commerce,/session_id/);
});

test('sharing keeps coaches email locked and parents separate from game helpers',()=>{
  const sharing=read('sharing.js');
  const migration=read('../supabase/migrations/20261001011000_hardcourt_sharing_and_coaches.sql');
  assert.match(sharing,/Parent \/ Viewer Link/);
  assert.match(sharing,/Coach Access/);
  assert.match(migration,/intended_email/);
  assert.match(migration,/5 coach seats/);
});

test('commercial bridge starts a seven day trial once',()=>{
  const migration=read('../supabase/migrations/20260930235500_hardcourt_commercial_bridge.sql');
  assert.match(migration,/interval '7 days'/);
  assert.match(migration,/trial_used=true/);
  assert.match(migration,/already used its trial or already has paid access/);
});
