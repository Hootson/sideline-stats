const assert=require("node:assert/strict");
const fs=require("node:fs");

const app=fs.readFileSync("app.js","utf8");
const restore=app.match(/async function restoreRememberedTeam\(\)\{([\s\S]*?)\n\}\nfunction cloudLinked/);

assert.ok(restore,"restoreRememberedTeam must remain defined");
assert.doesNotMatch(
  restore[1],
  /if\(teamExists\(\)\)\{updateCloudUI\(\);return\}/,
  "signed-in users must not be blocked from restoring their cloud team by stale local setup data"
);
assert.match(
  restore[1],
  /chooseCloudTeam\(\{preferredId,onlyAutomatic:true\}\)/,
  "startup should automatically restore a single available cloud team"
);

console.log("team restore login checks passed");
