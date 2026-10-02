import test from "node:test";
import assert from "node:assert/strict";
import { listSources, searchKnowledge } from "../src/knowledge.js";

test("authoritative sources are registered", () => {
  const keys = listSources().map(x => x.key);
  assert.ok(keys.includes("hardcourt_spec"));
  assert.ok(keys.includes("hardcourt_decisions"));
  assert.ok(keys.includes("hardcourt_acceptance"));
  assert.ok(keys.includes("agent_rules"));
  assert.ok(keys.includes("cost_policy"));
});

for (const [name, query, expected] of [
  ["substitutions", "bench substitution active five confirm minutes", /bench|substitut|active five/i],
  ["fast break", "fast break next field goal auto clears", /fast break/i],
  ["owner guardrails", "owner approval production Supabase paid cost", /approval|supabase|cost|paid/i]
]) {
  test(`retrieves ${name} context`, () => {
    const result = searchKnowledge(query, undefined, 8);
    assert.ok(result.length > 0);
    assert.match(result.map(x => x.heading+"\n"+x.text).join("\n"), expected);
  });
}
