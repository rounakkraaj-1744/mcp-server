import { NextRequest, NextResponse } from "next/server";
import { getGroq } from "@/lib/groq";
import { ROLE_ALLOWED_TABLES } from "@/lib/constants";
import { TABLE_CATALOG } from "@/lib/schema-catalog";
import { TABLE_SCHEMA, ROLE_QUERY_RULES } from "@/lib/schema-details";
import { executeQueryPlan } from "@/lib/query-executor";
import { QueryPlan } from "@/lib/types";
import { getUserFromSession } from "@/lib/auth";
import { searchSimilar } from "@/lib/vectorstore/supabase";
import { embedText } from "@/lib/embeddings/generate";
import { webSearch } from "@/lib/serp";

export const runtime = "nodejs";

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

async function handleDatabase(groq: any, question: string, user: any) {
    const allowed = ROLE_ALLOWED_TABLES[user.role] ?? [];
    if (allowed.length === 0) return { data: null, error: "no_access" };

    const catalogLines = allowed
        .filter(t => TABLE_CATALOG[t])
        .map(t => `- ${t}: ${TABLE_CATALOG[t]}`)
        .join("\n");

    const tablePickerPrompt = `Pick the ONE most relevant table to answer this question.

                                Available tables:
                                ${catalogLines}

                                Question: "${question}"

                                Output ONLY the table name (e.g. pilot_mission). Nothing else.`;

    const pickerRes = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        max_tokens: 30,
        messages: [{ role: "user", content: tablePickerPrompt }],
    });

    let selectedTable = (pickerRes.choices[0].message.content ?? "").trim().replace(/['"`]/g, "");

    if (!TABLE_CATALOG[selectedTable]) {
        const found = allowed.find(t => selectedTable.includes(t));
        if (found)
            selectedTable = found;
        else
            return { data: null, error: "table_not_found", rawResponse: selectedTable };
    }

    if (!allowed.includes(selectedTable)) {
        return { data: null, error: "access_denied", deniedTable: selectedTable };
    }

    const tableSchema = TABLE_SCHEMA[selectedTable];
    if (!tableSchema)
        return {
            data: null,
            error: "no_schema",
            table: selectedTable
        };

    const roleRules = ROLE_QUERY_RULES[user.role] ?? "";
    const userIdNote = roleRules.includes("<USER_ID>")
        ? roleRules.replace("<USER_ID>", String(user.userId))
        : roleRules;

    const planPrompt = `You are a database query planner. Output ONLY a JSON query plan for the table "${selectedTable}".

                        TABLE: ${selectedTable}
                        ${tableSchema}

                        ${userIdNote ? `Role rules for ${user.role}: ${userIdNote}\n` : ""}
                        Output format (strict JSON):
                        {
                        "table": "${selectedTable}",
                        "select_columns": ["col1", "col2"],
                        "aggregation": "COUNT" | "SUM" | "AVG" | "LIST" | null,
                        "aggregation_column": "col_name" | null,
                        "date_filter": { "column": "col", "range": "today" | "this_week" | "this_month" | "this_year" | "last_month" } | null,
                        "extra_filter": { "column": "col", "value": "literal_value" } | null
                        }

                        Rules:
                        - "extra_filter.value" MUST use the EXACT enum value from the schema above, not the user's words.
                        - Synonym mapping: "critical"/"urgent"/"severe" → "HIGH", "minor"/"low priority" → "LOW", "equipment"/"hardware" → "MAINTENANCE".
                        - If the user says "all" or doesn't specify a filter, set extra_filter to null (do NOT filter).
                        - NEVER put SQL logic inside the value field.
                        - For "how many" → aggregation: "COUNT"
                        - For "total"/"sum" → aggregation: "SUM"
                        - For "list"/"show" → aggregation: "LIST"

                        Question: "${question}"

                        Output ONLY valid JSON. No explanation.`;

    const planRes = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        max_tokens: 300,
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

    // Final RBAC safety net (in case LLM changed the table)
    if (!allowed.includes(plan.table)) {
        return { data: null, error: "access_denied", plan, deniedTable: plan.table };
    }

    try {
        const results = await executeQueryPlan(plan, user.userId, user.ownerID, user.role);
        return { data: results, plan, selectedTable };
    }
    catch (err: any) {
        console.error("Query execution error:", err);
        return { data: null, error: "query_failed", plan, message: err.message };
    }
}

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

        const intents = await classifyIntent(groq, question);
        const debug: any = { intents, role: user.role, userId: user.userId };

        let dbResult: string = "";
        let procedureResult: string = "";
        let webResult: string = "";

        if (intents.includes("DATABASE")) {
            const result = await handleDatabase(groq, question, user);
            debug.dbDebug = { selectedTable: result.selectedTable, plan: result.plan, error: result.error };

            if (result.error === "access_denied") {
                dbResult = `ACCESS RESTRICTED: As ${user.role}, you don't have authorization to access "${result.deniedTable}" data.`;
            } else if (result.data) {
                dbResult = JSON.stringify(result.data, null, 2);
                if (dbResult.length > 3000) dbResult = dbResult.slice(0, 3000) + "\n... (truncated)";
            }
        }

        if (intents.includes("PROCEDURE")) {
            procedureResult = await handleProcedure(question);
            debug.hasProcedure = !!procedureResult;
        }

        if (intents.includes("WEB")) {
            webResult = await handleWeb(question);
            debug.hasWeb = !!webResult;
        }

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