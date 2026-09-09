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
assert.match(app, /p_role:"coach"/, 'statkeepers must be able to create coach invitations');
assert.match(app, /team_identifier/, 'team identifiers must sync independently of display names');
assert.match(app, /restoreCloudPlayWithDemo/, 'isolated demo play calls must be joined during cloud load');
assert.match(app, /if\(raw\.playCall\?\.demo\)delete raw\.playCall/, 'demo calls must never write into real play events');
assert.match(html, /data-screen="coach"/, 'Coach Pro needs its own restricted screen');
assert.match(html, /data-coach-tab="playcalls"/, 'Coach Pro must include Play Calls');
assert.match(html, /data-coach-tab="debrief"/, 'Coach Pro must include Debrief');
assert.match(analytics, /WHAT’S WORKED ON \$\{ordinal\(selectedDown\)\} DOWN/, 'approved play-call heading must use the apostrophe');
assert.match(analytics, /coach-donut/, 'overview must include a visual run/pass chart');
assert.match(analytics, /heat-cell/, 'play calls must render as a traffic-light heat map');
assert.match(css, /@media \(max-width:560px\)/, 'phone-specific responsive rules must remain available');
assert.match(sql, /team_identifier/, 'database setup must support duplicate public team names');
assert.match(sql, /status = 'submitted'/, 'shared coach notes must expose submitted debriefs only');

const context={window:{}};
vm.runInNewContext(analytics,context);
const api=context.window.SidelineCoachAnalytics;
const demoGame={id:'g1',week:2,opponent:'Bears',gameType:'regular',plays:[
  {id:'p1',type:'Rush',yards:8,playCall:{id:'c1',number:1,name:'Power Right'},stateBefore:{possession:'ours',down:1,distance:10,ballSpot:25}},
  {id:'p2',type:'Rush',yards:5,playCall:{id:'c1',number:1,name:'Power Right'},stateBefore:{possession:'ours',down:1,distance:3,ballSpot:33}},
  {id:'p3',type:'Pass',sub:'Complete',yards:18,playCall:{id:'c2',number:15,name:'Quick Slant'},stateBefore:{possession:'ours',down:1,distance:6,ballSpot:38}}
]};
const rendered=api.render('playcalls',{games:[demoGame],selection:'season',down:1,metric:'success',playbook:Array.from({length:25})});
assert.match(rendered,/WHAT’S WORKED ON 1ST DOWN/,'the approved play-call headline must render with its apostrophe');
assert.match(rendered,/25 PLAYBOOK CALLS • 2 USED/,'play-call usage must compare the full playbook with calls used');
assert.match(rendered,/Power Right/,'the heat map must group recorded plays by call');

console.log('coach pro checks passed');
