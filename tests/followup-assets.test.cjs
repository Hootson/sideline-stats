const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('voice follow-up CSS enables vertical scrolling',()=>{
 const css=fs.readFileSync('voice-followup.css','utf8');
 assert.match(css,/\.modal \.player-grid/);assert.match(css,/overflow-y:auto/);assert.match(css,/-webkit-overflow-scrolling:touch/);
});
test('service worker caches follow-up assets and matches current app version',()=>{
 const sw=fs.readFileSync('service-worker.js','utf8'),pwa=fs.readFileSync('pwa.js','utf8'),versionFile=fs.readFileSync('version.js','utf8');
 assert.match(sw,/voice-followup\.css/);assert.match(sw,/followup-loader\.js/);
 const version=versionFile.match(/SIDELINE_STATS_VERSION\s*=\s*["']([^"']+)["']/)?.[1];
 assert.ok(version,'version.js should expose SIDELINE_STATS_VERSION');
 assert.match(pwa,/window\.SIDELINE_STATS_VERSION/);
 assert.match(sw,new RegExp(`v${version.replaceAll('.','-')}(?:-|')`));
});
