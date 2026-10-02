# Sideline MCP v1

Small, read-only Model Context Protocol server for the Bleacher Butt Stats engineering agents.

## Purpose

GitHub documentation remains the source of truth. This server is only an efficient doorway into that documentation so agents can retrieve narrow context instead of repeatedly loading every product document.

## Tools

- `list_product_sources` — lists authoritative documents and source keys.
- `get_product_source` — returns a complete authoritative document when full context is needed.
- `search_product_context` — retrieves the most relevant document sections for a focused implementation question.

## Guardrails

- Read-only.
- No GitHub writes.
- No Supabase access.
- No production actions.
- No billing or paid API use.
- Never overrides `docs/AGENT-RULES.md`, `docs/COST-POLICY.md`, or product decisions.
- If retrieved sections conflict, agents must consult the authoritative full documents and escalate only a genuine unresolved product decision.

## Local setup

From this directory:

```sh
npm install
npm test
npm start
```

The MCP server communicates over stdio.

## Agent usage

Prefer `search_product_context` for focused questions such as:

- "How do substitutions affect playing time?"
- "What is the Fast Break workflow?"
- "Which actions require owner approval?"
- "What must the Alpha Stats screen contain?"

Use `get_product_source` when implementing a broad feature or when narrow retrieval exposes an ambiguity.

This is deliberately v1. Do not expand it into an infrastructure project before Hardcourt Alpha is playable.
