const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const analytics = fs.readFileSync('coach-analytics.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const sql = fs.readFileSync('supabase-coach-pro.sql', 'utf8');

assert.match(app, /is_coach,status/, 'cloud role resolution must read coach membership');
assert.match(app, /function hasCoachAccess\(\)/, 'Coach Pro must be entitlement gated');
assert.match(app, /create_coach_invite/, 'statkeepers must be able to create email-locked coach invitations');
assert.match(app, /team_identifier/, 'team identifiers must sync independently of display names');
assert.match(app, /restoreCloudPlayWithDemo/, 'isolated demo play calls must be joined during cloud load');
assert.match(app, /if\(raw\.playCall\?\.demo\)delete raw\.playCall/, 'demo calls must never write into real play events');
assert.match(html, /data-screen="coach"/, 'Coach Pro needs its own restricted screen');
assert.match(html, /data-coach-tab="playcalls"/, 'Coach Pro must include Play Calls');
assert.match(html, /data-coach-tab="debrief"/, 'Coach Pro must include Debrief');
assert.match(html, /id="coachNav"[\s\S]*data-go="stats"[\s\S]*data-go="coach"/, 'coach navigation must expose only Stats and Analytics');
assert.doesNotMatch(html, /data-coach-go=/, 'individual analytics sections must not replace the coach Stats and Analytics navigation');
assert.match(analytics, /WHAT’S WORKED ON \$\{ordinal\(selectedDown\)\} DOWN/, 'approved play-call heading must use the apostrophe');
assert.match(analytics, /coach-donut/, 'overview must include a visual run/pass chart');
assert.match(analytics, /heat-cell/, 'play calls must render as a traffic-light heat map');
assert.match(analytics, /sortedCallGroups/, 'play calls must support success-based sorting');
assert.match(analytics, /Math\.round\(number\(value\)\*2\)\/2/, 'defensive credits must round to the nearest half');
assert.match(analytics, /trend-area/, 'season trends must include a responsive area chart');
assert.match(analytics, /RUN \/ PASS MIX BY GAME/, 'season trends must compare run and pass mix by game');
assert.match(app, /maybePromptCoachDebrief/, 'coach startup must check for an unfinished game debrief');
assert.match(app, /webkitSpeechRecognition/, 'coach debrief voice entry must use the existing browser speech capability');
assert.match(analytics, /Coach-provided context:/, 'submitted coach observations must be labeled separately inside Coach Read');
assert.match(css, /\.coach-section-tabs\{position:sticky/, 'analytics section controls must remain visible while scrolling');
assert.match(css, /\.heat-name\{position:sticky;left:0/, 'play names must remain visible in the play-call table');
assert.match(css, /@media \(max-width:560px\)/, 'phone-specific responsive rules must remain available');
assert.match(app, /x\.sub==="TFL"\|\|x\.tackleKind==="TFL"/, 'team summary must count legacy and current TFL representations');
assert.match(css, /body\.coach-mode \.top\{height:150px;max-height:150px;aspect-ratio:auto/, 'tablet and desktop analytics must use a compact masthead');
assert.match(css, /body\.coach-mode \.coach-section-tabs\{top:150px\}/, 'tablet and desktop analytics tabs must stay beneath the compact masthead');
assert.match(sql, /team_identifier/, 'database setup must support duplicate public team names');
assert.match(sql, /status = 'submitted'/, 'shared coach notes must expose submitted debriefs only');
assert.match(sql, /grant select on table public\.coach_demo_playbook to authenticated/, 'signed-in users need the Data API grant before RLS can evaluate demo playbook rows');
assert.match(sql, /grant select on table public\.coach_demo_play_calls to authenticated/, 'signed-in users need the Data API grant before RLS can evaluate demo play-call rows');

const context={window:{}};
vm.runInNewContext(analytics,context);
const api=context.window.SidelineCoachAnalytics;
const demoGame={id:'g1',week:2,opponent:'Bears',gameType:'regular',plays:[
  {id:'p1',type:'Rush',yards:8,playCall:{id:'c1',number:1,name:'Power Right'},stateBefore:{possession:'ours',down:1,distance:10,ballSpot:25}},
  {id:'p2',type:'Rush',yards:5,playCall:{id:'c1',number:1,name:'Power Right'},stateBefore:{possession:'ours',down:1,distance:3,ballSpot:33}},
  {id:'p3',type:'Pass',sub:'Complete',yards:18,playCall:{id:'c2',number:15,name:'Quick Slant'},stateBefore:{possession:'ours',down:1,distance:6,ballSpot:38}}
]};
const rendered=api.render('playcalls',{games:[demoGame],selection:'season',down:1,metric:'success',playbook:[{id:'c1',number:7,name:'Power Right Renamed'},...Array.from({length:24},(_,i)=>({id:`x${i}`,number:i+20,name:`Play ${i}`}))]});
assert.match(rendered,/WHAT’S WORKED ON 1ST DOWN/,'the approved play-call headline must render with its apostrophe');
assert.match(rendered,/25 PLAYBOOK CALLS • 2 USED/,'play-call usage must compare the full playbook with calls used');
assert.match(rendered,/Power Right Renamed/,'the heat map must use the permanent play concept’s current name');

const contextRead=api.render('overview',{games:[demoGame],selection:'season',debriefs:[
  {status:'draft',structured_context:{voice_notes:'Private draft must not appear'}},
  {status:'submitted',structured_context:{what_worked:'Our protection held up'}}
]});
assert.match(contextRead,/Data-supported:/,'Coach Read must identify data-derived commentary');
assert.match(contextRead,/Coach-provided context:/,'Coach Read must incorporate submitted debrief context');
assert.match(contextRead,/Our protection held up/,'submitted observations must influence Coach Read');
assert.doesNotMatch(contextRead,/Private draft/,'draft debriefs must remain private and excluded from Coach Read');

console.log('coach pro checks passed');
