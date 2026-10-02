import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listSources, readSource, searchKnowledge, SOURCES } from "./knowledge.js";

const server = new McpServer({ name: "bleacher-butt-stats-context", version: "0.1.0" });

server.tool("list_product_sources", "List authoritative Bleacher Butt Stats product-context documents.", {}, async () => ({
  content: [{ type: "text", text: JSON.stringify(listSources(), null, 2) }]
}));

server.tool("get_product_source", "Read one authoritative product-context document by source key.", {
  source: z.enum(Object.keys(SOURCES))
}, async ({ source }) => ({
  content: [{ type: "text", text: readSource(source) }]
}));

server.tool("search_product_context", "Return the most relevant sections of the authoritative product docs for a focused implementation question.", {
  query: z.string().min(2),
  sources: z.array(z.enum(Object.keys(SOURCES))).optional(),
  limit: z.number().int().min(1).max(20).optional()
}, async ({ query, sources, limit }) => ({
  content: [{ type: "text", text: JSON.stringify(searchKnowledge(query, sources, limit ?? 8), null, 2) }]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
