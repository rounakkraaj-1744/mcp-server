import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { embedText } from "@/lib/embeddings/generate";
import { searchSimilar } from "@/lib/vectorstore/supabase";
import { SCHEMA } from "@/lib/schema/definitions";

export const runtime = "nodejs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Define the 3 MCP tools as Groq-compatible tool definitions
const TOOLS: Groq.Chat.ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "search_schema",
            description: "Search the database schema with a natural language query. " +
                "Returns the most relevant tables and columns.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Natural language query about the schema" },
                },
                required: ["query"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_table_columns",
            description: "Get all columns for a specific table.",
            parameters: {
                type: "object",
                properties: {
                    table: { type: "string", description: "Table name e.g. 'users'" },
                },
                required: ["table"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "list_tables",
            description: "List all available tables in the database schema.",
            parameters: { type: "object", properties: {} },
        },
    },
];

// Execute whichever tool the LLM called
async function executeTool(name: string, args: any): Promise<string> {
    if (name === "search_schema") {
        const vector = await embedText(args.query);
        const hits = await searchSimilar(vector, 5);
        return hits
            .map((h: { text: string; score: number; }, i: number) => "[" + (i + 1) + "] " + h.text +
                " (score: " + Math.round(h.score * 100) / 100 + ")")
            .join("\n");
    }

    if (name === "get_table_columns") {
        const found = SCHEMA.find(t => t.table === args.table?.toLowerCase());
        if (!found) return "Table not found: " + args.table;
        return found.columns
            .map(c => c.name + " (" + c.type + "): " + c.description)
            .join("\n");
    }

    if (name === "list_tables") {
        return SCHEMA.map(t => t.table + ": " + t.description).join("\n");
    }

    return "Unknown tool: " + name;
}

export async function POST(req: NextRequest) {
    try {
        const { question } = await req.json();
        if (!question?.trim())
            return NextResponse.json({ error: "question required" }, { status: 400 });

        // Build message history — starts with just the user question
        const messages: Groq.Chat.ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: "You are a database schema expert. Use the provided tools to " +
                    "retrieve schema information before answering. Always call " +
                    "search_schema first, then use get_table_columns for details.",
            },
            { role: "user", content: question },
        ];

        // ── Agentic tool-call loop ────────────────────────────────────────────
        // The LLM may call tools multiple times before giving a final answer.
        while (true) {
            const response = await groq.chat.completions.create({
                model: "llama3-8b-8192",
                temperature: 0.2,
                max_tokens: 1024,
                tools: TOOLS,
                messages,
            });

            const msg = response.choices[0].message;
            messages.push(msg); // add assistant message to history

            // No tool calls → LLM has enough context, final answer ready
            if (!msg.tool_calls || msg.tool_calls.length === 0) {
                return NextResponse.json({ answer: msg.content });
            }

            // Execute each tool call and add results back into message history
            for (const tc of msg.tool_calls) {
                const args = JSON.parse(tc.function.arguments);
                const result = await executeTool(tc.function.name, args);

                messages.push({
                    role: "tool",
                    tool_call_id: tc.id,
                    content: result,
                });
            }
            // Loop back → LLM sees tool results and decides next step
        }

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}