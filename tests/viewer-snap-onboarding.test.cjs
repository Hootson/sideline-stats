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
  assert.match(parentHtml,/viewer-brand[^>]+brand-header-gridiron\.webp/,'parent live stats must use the Gridiron brand artwork');
  assert.match(parentHtml,/\.score-card\{[^}]*background:var\(--p\)[^}]*border:2px solid var\(--a\)/);
  assert.match(parentHtml,/\.stats-section \.section-title\{[^}]*background:var\(--p\)[^}]*border-bottom:5px solid var\(--a\)/);
  assert.match(parentJs,/--p-ink/);
  assert.match(parentJs,/--a-ink/);
  assert.match(parentHtml,/Auto-refreshes every 10 seconds|refresh automatically/);
  assert.match(parentHtml,/<th>TGT<\/th>/,'parent receiving stats should label targets');
  assert.match(parentJs,/tgt:0,rec:0/,'parent receiving stats should initialize targets for intended receivers');
  assert.match(parentJs,/s\.tgt\+\+/,'parent receiving stats should count every intended receiver target');
  assert.match(parentJs,/function preferredGame\(\)\{const gs=\[\.\.\.\(data\?\.games\|\|\[\]\)\]\.sort/,'parent viewer must sort games newest-first before selecting a live game');
  assert.match(parentJs,/!userSelectedGame&&preferred\?\.status==='live'&&preferred\.id!==prior/,'an open parent viewer must advance from an old game to the newest live game');
  assert.match(parentJs,/userSelectedGame=true/,'manual historical game selection must remain available');
  assert.match(parentHtml,/id="oppLogo" class="logo hidden"/,'parent scoreboard must reserve a matching opponent-logo position');
  assert.match(parentJs,/g\.opponent_logo_data/,'parent scoreboard must render the selected game opponent logo');
});

test('both snap views use the compact stacked player layout',()=>{
  assert.match(snapHtml,/shared-brand[^>]+brand-header-gridiron\.webp/,'shared Snap Tracker must use the Gridiron brand artwork');
  assert.match(snapHtml,/grid-template-columns:34px minmax\(0,1fr\) minmax\(78px,120px\)/);
  assert.match(snapHtml,/\.num\{display:block/);
  assert.match(snapHtml,/\.bar\{height:7px/);
  assert.match(styles,/\.snap-player\{grid-template-columns:34px minmax\(0,1fr\) minmax\(78px,120px\)/);
  assert.match(styles,/\.snap-player-name \.num\{display:block/);
  assert.match(styles,/\.snap-bar\{height:7px/);
});

test('shared stats branding preserves the established export sizes',()=>{
  assert.match(index,/class="stats-share-brand"/,'in-app share preview must carry the new brand');
  assert.match(styles,/\.stats-share-brand\{position:absolute/,'in-app share branding must not add header height');
  assert.match(app,/loadImg\("brand-header-gridiron\.webp"\)/,'generated images must use the new Gridiron artwork');
  assert.match(app,/const W=1080,H=1900/,'team summary export dimensions must remain unchanged');
  assert.match(app,/async function makeHybridSharePages\(src\)\{\s*const W=1080,H=2532/,'player box-score dimensions must remain unchanged');
  assert.match(app,/const W=1080,rowH=68,headerH=405/,'participation export width and header geometry must remain unchanged');
});

test('role onboarding and install guidance remain wired',()=>{
  assert.match(index,/id="quickStartCard"/);
  assert.match(index,/id="installAppBtn"/);
  for(const role of ['statkeeper-new','statkeeper','coach','viewer'])assert.match(app,new RegExp(role));
  assert.match(pwa,/beforeinstallprompt/);
  assert.match(pwa,/Add to Home Screen/);
  assert.match(version,/SIDELINE_STATS_VERSION="4\.6\.7"/);
  assert.match(pwa,/SIDELINE_STATS_VERSION=window\.SIDELINE_STATS_VERSION\|\|"current"/);
});

test('returning accounts see an automatic team-loading message',()=>{
  assert.match(index,/id="returningTeamLoader"[^>]*role="status"/);
  assert.match(index,/You’re already signed in\. No need to tap Sign In\./);
  assert.match(styles,/\.returning-team-loader\{[^}]*position:fixed/);
  assert.match(app,/if\(cloudUser\)\{showReturningTeamLoader\(\);try\{[\s\S]*?await restoreRememberedTeam\(\)[\s\S]*?\}finally\{await hideReturningTeamLoader\(\)\}\}/);
});

test('the roster navigation also identifies the playbook',()=>{
  assert.match(index,/data-go="roster"[^>]*>👥<br><span class="nav-long-label">Roster &amp;<br>Playbook<\/span>/);
  assert.match(app,/roster:"Roster & Playbook"/);
});

test('new parent and coach links carry the active release and account modal stays closable',()=>{
  assert.doesNotMatch(index,/V4\.5\.24/);
  assert.doesNotMatch(app,/appVersion:"4\.5\.24"/);
  assert.match(app,/function releaseViewerInviteUrl\(token\)/);
  assert.match(app,/searchParams\.set\("release",window\.SIDELINE_STATS_VERSION\|\|"current"\)/);
  assert.match(styles,/\.modal-card\{[^}]*max-height:calc\(100dvh/);
  assert.match(styles,/\.modal-card\{[^}]*overflow-y:auto/);
  assert.match(styles,/\.modal-close\{[^}]*position:sticky/);
  assert.match(index,/id="authModal"[\s\S]{0,100}class="modal-card account-modal-card"/);
});
