import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const read=p=>fs.readFileSync(path.join(here,'..',p),'utf8');

test('service worker caches every account-era runtime module',()=>{
  const sw=read('service-worker.js');
  for(const file of ['app.js','legacy-app.js','account-gate.js','account-flow.js','account-integration.js','cloud-account.js','onboarding.js','commercial-config.js','commerce.js','game-cloud.js','game-manager.js','sharing.js','engine.js']) assert.match(sw,new RegExp(file.replace('.','\\.')));
  assert.doesNotMatch(sw,/account-entry\.js/);
});

test('manifest remains installable as the Hardcourt edition',()=>{
  const manifest=JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.display,'standalone');
  assert.equal(manifest.start_url,'./');
  assert.equal(manifest.scope,'./');
  assert.match(manifest.name,/Hardcourt Edition/);
  assert.ok(manifest.icons?.length);
});

test('iOS install metadata and manifest are present',()=>{
  const html=read('index.html');
  assert.match(html,/apple-mobile-web-app-capable/);
  assert.match(html,/apple-mobile-web-app-title/);
  assert.match(html,/manifest\.webmanifest/);
});
