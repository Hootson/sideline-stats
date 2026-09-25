import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const appSource=await readFile(new URL("../app.js",import.meta.url),"utf8");
const legacySource=await readFile(new URL("../legacy-app.js",import.meta.url),"utf8");
const combined=appSource+"\n"+legacySource;

test("Hardcourt uses an auth storage key isolated from Gridiron",()=>{
  assert.match(combined,/sb-eyuvgzhkhcpwtcbmsvct-hardcourt-auth-token/);
  assert.match(combined,/createClient\(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,(?:hardcourtAuthOptions|authOptions)\)/);
});

test("Hardcourt sign out remains local to its own browser session",()=>{
  assert.match(combined,/auth\.signOut\(\{scope:"local"\}\)/);
  assert.doesNotMatch(combined,/auth\.signOut\(\)/);
});
