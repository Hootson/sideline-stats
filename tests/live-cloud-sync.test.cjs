const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('app.js', 'utf8');
const sw = fs.readFileSync('service-worker.js', 'utf8');
const sql = fs.readFileSync('supabase-live-stats.sql', 'utf8');

assert.match(app, /function scheduleCloudSync\(delay=350\)/, 'completed local changes should be queued quickly');
assert.match(app, /if\(cloudSyncRunning\)\{cloudSyncRequested=true;return\}/, 'a change during an active sync must request a follow-up pass');
assert.match(app, /if\(runAgain\)scheduleCloudSync\(100\)/, 'the queued follow-up pass must run after the active sync finishes');
assert.match(app, /table:'games',filter:`season_id=eq\.\$\{S\.cloud\.seasonId\}`/, 'game events must be scoped to the selected season');
assert.match(app, /table:'play_credits'/, 'player-credit changes must trigger viewer refreshes');
assert.match(app, /table:'snap_participants'/, 'snap-participant changes must trigger viewer refreshes');
assert.match(app, /await publishCloudGame\(cloudGameId\)/, 'a completed game sync must emit its publish marker');
assert.ok(app.indexOf('await syncOnePlay') < app.indexOf('await publishCloudGame(cloudGameId)'), 'publish marker must follow play sync');
assert.match(app, /cloudDeviceRole\(\)!=="viewer"/, 'view-only devices must never schedule writes');
assert.match(app, /"Live updates on"/, 'viewers should see a live-connection indicator');
assert.match(sql, /security invoker/, 'publish RPC must preserve RLS authorization');
assert.match(sw, /v4-5-4-reliable-live-sync/, 'service worker cache must be bumped');

console.log('live cloud sync checks passed');
