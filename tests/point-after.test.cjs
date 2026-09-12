const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');

assert.match(html,/data-try="Run" data-points="1"[^>]*>[\s\S]*?1-PT RUN/);
assert.match(html,/data-try="Pass" data-points="1"[^>]*>[\s\S]*?1-PT PASS/);
assert.match(html,/data-try="Kick" data-points="2"[^>]*>[\s\S]*?2-PT KICK/);
assert.match(html,/data-try="Run" data-points="2"[^>]*>[\s\S]*?2-PT RUN/);
assert.match(html,/data-try="Pass" data-points="2"[^>]*>[\s\S]*?2-PT PASS/);
assert.match(app,/tryValue=Number\(b\.dataset\.points\|\|0\)/,'the selected conversion value must be stored');
assert.match(app,/S\.flow\.tryResult==="Good"\?Number\(S\.flow\.tryValue\|\|2\):0/,'successful tries must award their selected value');
assert.match(app,/TryValue:p\.type==="Try"\?Number\(p\.tryValue\|\|p\.points\|\|2\):0/,'exports must retain the attempted conversion value');
console.log('point-after checks passed');
