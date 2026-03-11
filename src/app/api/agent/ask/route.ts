import { NextRequest, NextResponse } from "next/server";
import { getGroq } from "@/lib/groq";
import { SCHEMA_KNOWLEDGE } from "@/lib/schema-knowledge";
import { ROLE_ALLOWED_TABLES } from "@/lib/constants";
import { executeQueryPlan } from "@/lib/query-executor";
import { QueryPlan } from "@/lib/types";
import { getUserFromSession } from "@/lib/auth";
import { searchSimilar } from "@/lib/vectorstore/supabase";
import { embedText } from "@/lib/embeddings/generate";
import { webSearch } from "@/lib/serp";

export const runtime = "nodejs";

// ── Helper: classify intent ──
async function classifyIntent(groq: any, question: string): Promise<string[]> {
    const res = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        max_tokens: 50,
        messages: [{
            role: "user",
            content: `Classify this question into one or more categories. Output ONLY a JSON array.
Categories:
- DATABASE: questions about platform data (missions, drones, pilots, tickets, alerts, tools, training records, etc.)
- PROCEDURE: questions about company procedures, process flows like GO.00, GM.01, PR-TLB, or "how-to" operational rules
- WEB: questions about external regulations (EASA, EU laws), industry standards, or general drone knowledge

Question: ${question}
Output ONLY the JSON array like ["DATABASE"] or ["PROCEDURE","WEB"]. Nothing else.`
        }],
    });
    try {
        return JSON.parse(res.choices[0].message.content || '["DATABASE"]');
    }
    catch {
        return ["DATABASE"];
    }
}

// ── Helper: handle DATABASE questions (your original working pipeline) ──
async function handleDatabase(groq: any, question: string, user: any) {
    const schemaDoc = SCHEMA_KNOWLEDGE[user.role];
    if (!schemaDoc) return { data: null, error: `No schema knowledge for role: ${user.role}` };

    const planPrompt = `You are a highly intelligent database query planner for READI, a complex drone operations platform.
                        Given the schema below and a user question, output ONLY a JSON query plan.

                        Output format (strict JSON, no markdown, no explanation):
                        {
                        "table": "table_name",
                        "select_columns": ["col1", "col2"],
                        "aggregation": "COUNT" | "SUM" | "AVG" | "LIST" | null,
                        "aggregation_column": "col_name" | null,
                        "date_filter": { "column": "col", "range": "today" | "this_week" | "this_month" | "this_year" | "last_month" } | null,
                        "extra_filter": { "column": "col", "value": "val" } | null
                        }

                        Rules & Intelligence:
                        - "Drones" or "Equipment" always map to the "tool" table.
                        - "Pilots" or "Staff" usually map to the "users" table.
                        - "Incidents" or "Hazards" map to "safety_report".
                        - IMPORTANT: "extra_filter.value" MUST be a single literal value (e.g., "Completed" or "91").
                        - NEVER put SQL logic like "role = 'Pilot'" or "id > 5" inside the "value" field.
                        - We can only query ONE table at a time. Pick the table that contains the most relevant data.
                        - If the user asks for "scope" or "permissions", they want to know what they can access - use your knowledge of the schema provided.
                        - For "how many" questions, use aggregation: "COUNT".
                        - For "total" / "sum" questions, use aggregation: "SUM" with the appropriate aggregation_column.
                        - For "list" / "show" questions, use aggregation: "LIST" with the relevant select_columns.
                        - Always pick the most relevant table from the SCHEMA section below.
                        - If a filter value is mentioned (e.g. "Completed"), use extra_filter.

                        SCHEMA FOR ROLE ${user.role}:
                        ${schemaDoc}

                        USER QUESTION: ${question}

                        Output ONLY valid JSON. No explanation. No markdown backticks.`;

    const planRes = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        max_tokens: 500,
        messages: [{ role: "user", content: planPrompt }],
    });

    const planText = planRes.choices[0].message.content ?? "";
    const cleanPlan = planText.replace(/```json|```/g, "").trim();

    let plan: QueryPlan;
    try {
        plan = JSON.parse(cleanPlan);
    }
    catch {
        return { data: null, error: "parse_failed", rawPlan: planText };
    }

    const allowed = ROLE_ALLOWED_TABLES[user.role] ?? [];
    if (!allowed.includes(plan.table)) {
        return { data: null, error: "access_denied", plan, deniedTable: plan.table, allowedTables: allowed };
    }

    try {
        const results = await executeQueryPlan(plan, user.userId, user.ownerID, user.role);
        return { data: results, plan };
    }
    catch (err: any) {
        console.error("Query execution error:", err);
        return { data: null, error: "query_failed", plan, message: err.message };
    }
}

// ── Helper: handle PROCEDURE questions (RAG from translated manual) ──
async function handleProcedure(question: string) {
    try {
        const queryVector = await embedText(question);
        const matches = await searchSimilar(queryVector, 3);
        return matches.map((m: any) => m.text).join("\n\n");
    }
    catch (err) {
        console.error("Procedure search error:", err);
        return "";
    }
}

// ── Helper: handle WEB questions (Serp API) ──
async function handleWeb(question: string) {
    try {
        const results = await webSearch(question);
        return results.map((r: any) => `${r.title}: ${r.snippet} (${r.link})`).join("\n\n");
    }
    catch (err) {
        console.error("Web search error:", err);
        return "";
    }
}

export async function POST(req: NextRequest) {
    try {
        const groq = getGroq();
        const body = await req.json();
        const { question } = body;

        if (!question?.trim())
            return NextResponse.json({ error: "question is required" }, { status: 400 });

        const user = await getUserFromSession(req);

        // ── STEP 1: Classify the intent ──
        const intents = await classifyIntent(groq, question);
        const debug: any = { intents, role: user.role, userId: user.userId };

        // ── STEP 2: Gather context from each source ──
        let dbResult: string = "";
        let procedureResult: string = "";
        let webResult: string = "";

        // DATABASE (your original working pipeline — untouched)
        if (intents.includes("DATABASE")) {
            const result = await handleDatabase(groq, question, user);
            debug.dbDebug = result;

            if (result.error === "access_denied") {
                dbResult = `ACCESS RESTRICTED: As ${user.role}, you don't have authorization to access "${result.deniedTable}" data.`;
            } else if (result.error === "parse_failed") {
                dbResult = "";
            } else if (result.error === "query_failed") {
                dbResult = "";
            } else if (result.data) {
                dbResult = JSON.stringify(result.data, null, 2);
                if (dbResult.length > 3000) dbResult = dbResult.slice(0, 3000) + "\n... (truncated)";
            }
        }

        // PROCEDURE (RAG from translated manual)
        if (intents.includes("PROCEDURE")) {
            procedureResult = await handleProcedure(question);
            debug.hasProcedure = !!procedureResult;
        }

        // WEB (Serp API)
        if (intents.includes("WEB")) {
            webResult = await handleWeb(question);
            debug.hasWeb = !!webResult;
        }

        // ── STEP 3: LLM synthesizes the final answer ──
        const answerPrompt = `You are a helpful and professional business intelligence assistant for READI.
The user is logged in as ${user.name} with role ${user.role}.
The user asked: "${question}"

${dbResult ? `Platform data results:\n${dbResult}\n` : ""}
${procedureResult ? `Company procedure knowledge:\n${procedureResult}\n` : ""}
${webResult ? `External regulatory information:\n${webResult}\n` : ""}

Instructions:
- Answer directly using the provided information above.
- If platform data exists, present it as a clean list or summary.
- If procedure knowledge exists, reference procedure codes like GO.00, GM.01, PR-TLB.
- If external info exists, cite it naturally.
- If a section says "ACCESS RESTRICTED", tell the user their role doesn't have permission.
- DO NOT invent or fabricate data that isn't provided above.
- DO NOT give business advice or suggest "next steps".
- SKIP all greetings and preamble. Jump straight to the answer.
- DO NOT mention databases, SQL, tables, or "web search".
- Be professional, factual, and concise. Just check and tell.`;

        const answerRes = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 500,
            messages: [{ role: "user", content: answerPrompt }],
        });

        return NextResponse.json({
            answer: answerRes.choices[0].message.content,
            debug,
        });
    }
    catch (err: any) {
        console.error("Agent error:", err);
        return NextResponse.json(
            { error: err.message ?? "Internal server error" },
            { status: 500 }
        );
    }
}