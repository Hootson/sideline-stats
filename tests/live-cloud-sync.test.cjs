const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('app.js', 'utf8');
const sw = fs.readFileSync('service-worker.js', 'utf8');
const sql = fs.readFileSync('supabase-live-stats.sql', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(app, /function scheduleCloudSync\(delay=350\)/, 'completed local changes should be queued quickly');
assert.match(app, /if\(cloudSyncRunning\)\{cloudSyncRequested=true;return\}/, 'a change during an active sync must request a follow-up pass');
assert.match(app, /if\(runAgain\)scheduleCloudSync\(100\)/, 'the queued follow-up pass must run after the active sync finishes');
assert.match(app, /resolveCloudDeviceRole\(\)\.then\(role=>/, 'an apparent viewer with a local change must recheck its real membership');
assert.match(app, /persist\(\{skipCloud:true\}\);await resolveCloudDeviceRole\(\)/, 'every cloud load must restore the signed-in account role');
assert.match(app, /scheduleCloudSync\(0\);return toast\("Sync retry started"\)/, 'Retry Sync must preserve and upload pending statkeeper data');
assert.match(app, /table:'games',filter:`season_id=eq\.\$\{S\.cloud\.seasonId\}`/, 'game events must be scoped to the selected season');
assert.match(app, /table:'play_credits'/, 'player-credit changes must trigger viewer refreshes');
assert.match(app, /table:'snap_participants'/, 'snap-participant changes must trigger viewer refreshes');
assert.match(app, /await publishCloudGame\(cloudGameId\)/, 'a completed game sync must emit its publish marker');
assert.ok(app.indexOf('await syncOnePlay') < app.indexOf('await publishCloudGame(cloudGameId)'), 'publish marker must follow play sync');
assert.match(app, /if\(!isCloudStatkeeper\(\)\)\{[\s\S]*if\(role==="statkeeper"\)scheduleCloudSync\(delay\)/, 'only a verified statkeeper may continue to a write');
assert.match(app, /"Live updates on"/, 'viewers should see a live-connection indicator');
assert.match(app, /cloudAutoRefreshRunning=false/, 'automatic viewer reloads must use an explicitly declared lock');
assert.match(app, /setInterval\(checkLiveGameRevisions,3000\)/, 'visible viewers should check game revisions every three seconds');
assert.match(app, /\.select\("id,revision"\)/, 'the frequent viewer check must fetch only lightweight revision markers');
assert.match(app, /document\.visibilityState==="hidden"/, 'the frequent viewer check must pause while the page is hidden');
assert.match(app, /cloudRevision:Number\(g\.revision\|\|1\)/, 'cloud-loaded games must retain the revision used for redraw checks');
assert.match(app, /else setTimeout\(checkLiveGameRevisions,100\)/, 'viewers must check immediately after reconnecting or returning to the page');
assert.match(sql, /security invoker/, 'publish RPC must preserve RLS authorization');
assert.match(app, /if\(teamExists\(\)&&isCloudViewer\(\)&&name!=="stats"\)/, 'viewer navigation must be restricted to Stats');
assert.match(app, /selectedStatsGameId=selectedStatsGameId\|\|latestGame\(\)\?\.id/, 'viewer entry must default to the newest game');
assert.match(app, /if\(!isCloudViewer\(\)&&currentGame\(\)\)selectedStatsGameId=currentGame\(\)\.id/, 'a statkeeper active game must not override a viewer game selection');
assert.match(app, /bottomNav"\)\.classList\.toggle\("hidden",!teamExists\(\)\|\|viewer\)/, 'viewer navigation tabs must be hidden');
assert.match(app, /analyticsExportCard"\)\?\.classList\.toggle\("hidden",viewer\)/, 'viewer analytics exports must be hidden');
assert.match(app, /function renderViewerGameSummary\(\)/, 'viewer Game Center must render its scoreboard');
assert.match(html, /id="viewerGameSummary"/, 'Stats must contain the viewer scoreboard destination');
assert.match(html, /id="shareStatsBtn"/, 'Stats sharing must remain available');
assert.match(sw, /v4-5-7-viewer-game-center/, 'service worker cache must be bumped');

console.log('live cloud sync checks passed');
