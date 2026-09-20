import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "../../..");

export const SOURCES = {
  platform: "docs/PLATFORM.md",
  cost_policy: "docs/COST-POLICY.md",
  agent_rules: "docs/AGENT-RULES.md",
  hardcourt_spec: "docs/hardcourt/SPEC.md",
  hardcourt_decisions: "docs/hardcourt/DECISIONS.md",
  hardcourt_acceptance: "docs/hardcourt/ACCEPTANCE-CRITERIA.md",
  hardcourt_readme: "hardcourt/README.md"
};

export function readSource(key) {
  const rel = SOURCES[key];
  if (!rel) throw new Error(`Unknown source: ${key}`);
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

export function listSources() {
  return Object.entries(SOURCES).map(([key, file]) => ({ key, file }));
}

function chunks(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let heading = "Document";
  let buf = [];
  const flush = () => {
    const body = buf.join("\n").trim();
    if (body) out.push({ heading, body });
    buf = [];
  };
  for (const line of lines) {
    if (/^#{1,4}\s+/.test(line)) {
      flush();
      heading = line.replace(/^#{1,4}\s+/, "").trim();
    } else buf.push(line);
  }
  flush();
  return out;
}

export function searchKnowledge(query, sourceKeys = Object.keys(SOURCES), limit = 8) {
  const terms = String(query).toLowerCase().match(/[a-z0-9+/-]+/g) || [];
  const results = [];
  for (const key of sourceKeys) {
    const rel = SOURCES[key];
    if (!rel) continue;
    for (const chunk of chunks(readSource(key))) {
      const hay = (chunk.heading + "\n" + chunk.body).toLowerCase();
      const score = terms.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
      if (score) results.push({ source: key, file: rel, heading: chunk.heading, score, text: chunk.body });
    }
  }
  return results.sort((a,b) => b.score-a.score || a.file.localeCompare(b.file)).slice(0, Math.max(1, Math.min(limit, 20)));
}
