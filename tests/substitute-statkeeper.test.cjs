const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const sql = fs.readFileSync('supabase/migrations/20260917030000_game_substitute_statkeeper.sql', 'utf8');

assert.match(sql, /private\.game_statkeeper_invites/, 'invite records must stay outside the public API schema');
assert.match(sql, /private\.game_statkeeper_assignments/, 'assignments must stay outside the public API schema');
assert.match(sql, /select lower\(u\.email\).*from auth\.users/s, 'redemption must use the authenticated account email');
assert.match(sql, /v_email is distinct from v_inv\.intended_email/, 'a forwarded link must fail for the wrong account');
assert.doesNotMatch(sql, /insert into public\.team_members/, 'a substitute must not become a reusable team member or coach seat');
assert.match(sql, /private\.is_game_substitute\(game_id\)/, 'write policies must scope access to the assigned game');
assert.match(sql, /private\.can_statkeep_game\(p_game_id\)/, 'the authoritative play RPC must accept only managers or the assigned substitute');
assert.match(sql, /finish_game_statkeeper_assignment/, 'finalization must explicitly close substitute access after the final sync');
assert.match(sql, /if new\.status='archived'/, 'the archive trigger must not revoke access before final game publishing completes');
assert.match(sql, /revoke all on private\.game_statkeeper_(invites|assignments) from public,anon,authenticated/, 'private tokens and assignments must not be directly readable');

assert.match(app, /searchParams\.set\("gameStatkeeperInvite",token\)/, 'the one-game link must have its own invitation parameter');
assert.match(app, /redeem_game_statkeeper_invite/, 'signed-in recipients must redeem the secure invitation');
assert.match(app, /get_my_game_statkeeper_assignment/, 'the assigned game must recover on another signed-in device');
assert.match(app, /create_game_statkeeper_invite/, 'owners must be able to create a game invitation');
assert.match(app, /revoke_game_statkeeper/, 'owners must be able to revoke and take over');
assert.match(app, /finish_game_statkeeper_assignment/, 'the app must close access only after publishing the final game');
assert.match(app, /isSubstituteStatkeeper\(\)&&!\['game','snaps','stats'\]\.includes\(name\)/, 'substitutes must be restricted to game-day screens');
assert.match(app, /if\(!substitute\)\{await ensureCloudTeam\(\);ensureCurrentRun\(\);await ensureCloudRoster\(\);ensureCurrentRun\(\)\}/, 'substitutes must never sync team or roster changes');
assert.match(app, /if\(!substitute\)await syncDeletedCloudGames\(\)/, 'substitutes must never archive other games');
assert.match(app, /roleOverride:"substitute_statkeeper"/, 'redeemed invitations must open in the substitute role');

for (const id of ['substituteStatkeeperBanner','substituteStatkeeperCard','gameStatkeeperEmail','createGameStatkeeperInviteBtn','revokeGameStatkeeperBtn']) {
  assert.match(html, new RegExp(`id="${id}"`), `${id} must be present in the live game UI`);
}
assert.ok(html.indexOf('id="undo"') < html.indexOf('id="substituteStatkeeperCard"'), 'the substitute link must follow Undo Last Play');
assert.ok(html.indexOf('id="substituteStatkeeperCard"') < html.indexOf('<h2 style="margin:0">Recent plays</h2>'), 'the substitute link must precede Recent Plays');

console.log('substitute statkeeper checks passed');
