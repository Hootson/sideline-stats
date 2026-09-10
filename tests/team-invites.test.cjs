const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sql=fs.readFileSync('supabase-team-invites.sql','utf8');

assert.match(app,/SB\.auth\.signUp\(\{email,password,options:\{emailRedirectTo:redirectTo\}\}\)/,'email account creation must remain enabled');
assert.match(app,/redirectUrl\.searchParams\.set\("teamInvite",inviteToken\)/,'email confirmation must preserve the team invitation');
assert.match(app,/SB\.rpc\("redeem_team_invite",\{p_token:token\}\)/,'signed-in users must redeem the invitation');
assert.match(app,/destination:"stats"/,'a redeemed invitation must open on the team stats screen');
assert.match(app,/p_role:"viewer"/,'parent links must grant viewer access only');
assert.match(app,/p_role:"coach"/,'coach links must grant coach access only');
assert.match(html,/id="createViewerInviteBtn"/,'statkeepers need a parent-link control');
assert.match(html,/id="createCoachInviteBtn"/,'statkeepers need a coach-link control');
assert.match(sql,/create table if not exists private\.team_invites/,'raw invitation data must stay outside the exposed public schema');
assert.match(sql,/if v_uid is null/,'both invitation RPCs must require an authenticated user');
assert.match(sql,/private\.can_manage_team\(p_team_id\)/,'only authorized team managers may create invitations');
assert.match(sql,/encode\(digest\(v_token,'sha256'\),'hex'\)/,'only a hash of the invitation token may be stored');
assert.match(sql,/revoke all on function public\.create_team_invite\(uuid,text,integer\) from public, anon/);
assert.match(sql,/revoke all on function public\.redeem_team_invite\(text\) from public, anon/);
console.log('team invitation and role checks passed');
