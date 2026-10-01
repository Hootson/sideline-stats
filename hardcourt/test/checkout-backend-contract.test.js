import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(here,'..','..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Stripe checkout returns Hardcourt purchases to Hardcourt',()=>{const source=read('supabase/functions/create-stripe-checkout/index.ts');assert.match(source,/edition==="hardcourt"/);assert.match(source,/sideline-stats\/hardcourt\//);assert.match(source,/metadata\[edition\]/)});
test('Stripe promotion codes are enabled for friends and family coupons',()=>{const source=read('supabase/functions/create-stripe-checkout/index.ts');assert.match(source,/allow_promotion_codes/);assert.match(source,/"true"/)});
test('Bleacher Butt Stats domains are accepted by checkout functions',()=>{for(const file of ['supabase/functions/create-stripe-checkout/index.ts','supabase/functions/checkout-status/index.ts']){const source=read(file);assert.match(source,/https:\/\/bleacherbuttstats\.com/);assert.match(source,/https:\/\/www\.bleacherbuttstats\.com/)}});
test('Hardcourt checkout remembers the purchasing team and cleans return parameters',()=>{const source=read('hardcourt/commerce.js');assert.match(source,/hcCheckoutTeamId/);assert.match(source,/sessionStorage\.setItem/);assert.match(source,/checkout','session_id','subscription_id/);assert.match(source,/result==='cancelled'/);assert.match(source,/sessionStorage\.removeItem\('hcCheckoutTeamId'\)/)});
test('successful checkout retries verification and refreshes access',()=>{const source=read('hardcourt/commerce.js');assert.match(source,/for\(let i=0;i<10;i\+\+\)/);assert.match(source,/verifyCheckout\(sessionId\)/);assert.match(source,/Payment confirmed\. Hardcourt access is active/);assert.match(source,/await refresh\(\)\.catch/)});
