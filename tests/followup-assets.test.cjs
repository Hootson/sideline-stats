const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('voice follow-up CSS enables vertical scrolling',()=>{
 const css=fs.readFileSync('voice-followup.css','utf8');
 assert.match(css,/\.modal \.player-grid/);assert.match(css,/overflow-y:auto/);assert.match(css,/-webkit-overflow-scrolling:touch/);
});
test('service worker caches follow-up assets and version is 4.5.35',()=>{
 const sw=fs.readFileSync('service-worker.js','utf8'),pwa=fs.readFileSync('pwa.js','utf8');
 assert.match(sw,/voice-followup\.css/);assert.match(sw,/followup-loader\.js/);assert.match(sw,/v4-5-35/);assert.match(pwa,/4\.5\.35/);
});
