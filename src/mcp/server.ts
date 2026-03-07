import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { embedText } from "../lib/embeddings/generate";
import { searchSimilar } from "../lib/vectorstore/supabase";
import { SCHEMA } from "../lib/schema/definitions";

const server = new McpServer({
    name: "schema-rag",
    version: "1.0.0",
});

// ── Tool 1: search_schema ────────────────────────────────────────────────
// The main RAG tool. LLM calls this when it needs to find relevant schema.
server.tool(
    "search_schema",
    "Search the database schema using a natural language query. " +
    "Returns the most relevant tables and columns.",
    {
        query: z.string().describe("Natural language question about the schema")
    },
    async ({ query }) => {
        const vector = await embedText(query);
        const hits = await searchSimilar(vector, 5);
        const result = hits.map((h: { text: string; score: number; }, i: number) => "[" + (i + 1) + "] " + h.text + " (score: " + Math.round(h.score * 100) / 100 + ")").join("\n");

        return {
            content: [{
                type: "text",
                text: result
            }]
        };
    }
);

// ── Tool 2: get_table_columns ────────────────────────────────────────────
// Returns full column list for a specific table.
server.tool(
    "get_table_columns",
    "Get all columns for a specific table with their types and descriptions.",
    {
        table: z.string().describe("The table name, e.g. 'users' or 'invoices'")
    },
    async ({ table }) => {
        const found = SCHEMA.find(t => t.table === table.toLowerCase());

        if (!found) {
            const available = SCHEMA.map(t => t.table).join(", ");
            return {
                content: [{
                    type: "text",
                    text: 'Table "' + table + '" not found. Available: ' + available,
                }],
            };
        }

        const cols = found.columns.map(c => "  " + c.name + " (" + c.type + ") — " + c.description).join("\n");

        return {
            content: [{
                type: "text",
                text: 'Table "' + found.table + '": ' + found.description + "\n\nColumns:\n" + cols,
            }],
        };
    }
);

// ── Tool 3: list_tables ──────────────────────────────────────────────────
// Returns all available tables — useful for orientation.
server.tool(
    "list_tables",
    "List all available tables in the database schema with their descriptions.",
    {},
    async () => {
        const list = SCHEMA
            .map(t => "• " + t.table + ": " + t.description)
            .join("\n");

        return {
            content: [{ type: "text", text: "Available tables:\n\n" + list }],
        };
    }
);

// ── Start server ─────────────────────────────────────────────────────────
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Schema RAG MCP server ready");
}

main().catch(console.error);