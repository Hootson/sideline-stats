import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const appSource=await readFile(new URL("../app.js",import.meta.url),"utf8");

test("Hardcourt uses an auth storage key isolated from Gridiron",()=>{
  assert.match(appSource,/HARDCOURT_AUTH_STORAGE_KEY="sb-eyuvgzhkhcpwtcbmsvct-hardcourt-auth-token"/);
  assert.match(appSource,/createClient\(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,hardcourtAuthOptions\)/);
});

test("Hardcourt sign out remains local to its own browser session",()=>{
  assert.match(appSource,/auth\.signOut\(\{scope:"local"\}\)/);
  assert.doesNotMatch(appSource,/auth\.signOut\(\)/);
});
