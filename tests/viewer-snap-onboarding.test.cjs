const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const parentHtml=fs.readFileSync('parent-viewer.html','utf8');
const parentJs=fs.readFileSync('parent-viewer.js','utf8');
const snapHtml=fs.readFileSync('snap-tracker.html','utf8');
const styles=fs.readFileSync('styles.css','utf8');
const app=fs.readFileSync('app.js','utf8');
const pwa=fs.readFileSync('pwa.js','utf8');
const version=fs.readFileSync('version.js','utf8');
const index=fs.readFileSync('index.html','utf8');

test('parent viewer scoreboard and box scores use team colors',()=>{
  assert.match(parentHtml,/\.score-card\{[^}]*background:var\(--p\)[^}]*border:2px solid var\(--a\)/);
  assert.match(parentHtml,/\.stats-section \.section-title\{[^}]*background:var\(--p\)[^}]*border-bottom:5px solid var\(--a\)/);
  assert.match(parentJs,/--p-ink/);
  assert.match(parentJs,/--a-ink/);
  assert.match(parentHtml,/Auto-refreshes every 10 seconds|refresh automatically/);
});

test('both snap views use the compact stacked player layout',()=>{
  assert.match(snapHtml,/grid-template-columns:34px minmax\(0,1fr\) minmax\(78px,120px\)/);
  assert.match(snapHtml,/\.num\{display:block/);
  assert.match(snapHtml,/\.bar\{height:7px/);
  assert.match(styles,/\.snap-player\{grid-template-columns:34px minmax\(0,1fr\) minmax\(78px,120px\)/);
  assert.match(styles,/\.snap-player-name \.num\{display:block/);
  assert.match(styles,/\.snap-bar\{height:7px/);
});

test('role onboarding and install guidance remain wired',()=>{
  assert.match(index,/id="quickStartCard"/);
  assert.match(index,/id="installAppBtn"/);
  for(const role of ['statkeeper-new','statkeeper','coach','viewer'])assert.match(app,new RegExp(role));
  assert.match(pwa,/beforeinstallprompt/);
  assert.match(pwa,/Add to Home Screen/);
  assert.match(version,/SIDELINE_STATS_VERSION="4\.5\.43"/);
  assert.match(pwa,/SIDELINE_STATS_VERSION=window\.SIDELINE_STATS_VERSION\|\|"current"/);
});

test('new parent and coach links carry the active release and account modal stays closable',()=>{
  assert.doesNotMatch(index,/V4\.5\.24/);
  assert.doesNotMatch(app,/appVersion:"4\.5\.24"/);
  assert.match(app,/function releaseInviteUrl\(token\)/);
  assert.match(app,/searchParams\.set\("release",window\.SIDELINE_STATS_VERSION\|\|"current"\)/);
  assert.match(styles,/\.modal-card\{[^}]*max-height:calc\(100dvh/);
  assert.match(styles,/\.modal-card\{[^}]*overflow-y:auto/);
  assert.match(styles,/\.modal-close\{[^}]*position:sticky/);
  assert.match(index,/id="authModal"[\s\S]{0,100}class="modal-card account-modal-card"/);
});
