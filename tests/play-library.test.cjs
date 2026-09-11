const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('app.js', 'utf8');
const analytics = fs.readFileSync('coach-analytics.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const sql = fs.readFileSync('supabase-play-library.sql', 'utf8');

assert.match(html, /V4\.5\.20/, 'the visible build label must identify V4.5.20');
assert.match(app, /function defaultGamePlan\(\)/, 'master plays must produce a default weekly plan');
assert.match(app, /number<0\|\|number>99/, 'master and weekly play numbers must allow zero and stop at 99');
assert.match(app, /function priorGameWithPlan\(g\)/, 'a prior weekly plan must be discoverable for copying');
assert.match(app, /value\|\|"defaults"/, 'new games must use the current master-playbook numbering by default');
assert.match(html, /id="loadCurrentPlaybookBtn"/, 'existing games need a one-tap current-playbook loader');
assert.match(app, /Loaded \$\{g\.gamePlan\.length\} plays from the current playbook/, 'the current-playbook loader must populate the whole game plan');
assert.match(app, /Copied Week \$\{prior\.week\} game plan/, 'copying a prior plan must be available in the active game');
assert.match(app, /Play updated — analytics history preserved/, 'editing a master play must retain its permanent ID');
assert.doesNotMatch(app, /S\.team\.playbook=S\.team\.playbook\.filter/, 'master play management must not hard-delete concepts');
assert.match(analytics, /concepts\.get\(key\)/, 'analytics must resolve recorded calls through permanent play IDs');
assert.match(analytics, /group\.numbers\.add/, 'analytics must retain weekly number variations for display');
assert.match(sql, /add column if not exists game_plan jsonb/, 'the database migration must add per-game plans safely');
assert.match(sql, /jsonb_typeof\(game_plan\) = 'array'/, 'the database must reject malformed game-plan values');
assert.match(html, /id="playNumber"[^>]*min="0"[^>]*max="99"/, 'master play entry must expose the 0–99 range');
assert.match(html, /id="gamePlanNumber"[^>]*min="0"[^>]*max="99"/, 'weekly numbering must expose the 0–99 range');

console.log('play library checks passed');
