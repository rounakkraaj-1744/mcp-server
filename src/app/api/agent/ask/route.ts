import { NextRequest, NextResponse } from "next/server";
import { getGroq } from "@/lib/groq";
import { SCHEMA_KNOWLEDGE } from "@/lib/schema-knowledge";
import { ROLE_ALLOWED_TABLES } from "@/lib/constants";
import { executeQueryPlan } from "@/lib/query-executor";
import { QueryPlan } from "@/lib/types";
import { getUserFromSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const groq = getGroq();


        const body = await req.json();
        const { question } = body;

        if (!question?.trim())
            return NextResponse.json({ error: "question is required" }, { status: 400 });

        const user = await getUserFromSession(req);
        const schemaDoc = SCHEMA_KNOWLEDGE[user.role];

        if (!schemaDoc)
            return NextResponse.json({ error: `No schema knowledge for role: ${user.role}` }, { status: 400 });

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
            return NextResponse.json({
                answer: "I'm having trouble mapping that request to my database system. Could you try being a bit more specific about what you're looking for?",
                debug: { rawPlan: planText },
            });
        }

        const allowed = ROLE_ALLOWED_TABLES[user.role] ?? [];
        if (!allowed.includes(plan.table)) {
            return NextResponse.json({
                answer: `I apologize, but as an ${user.role}, I don't have authorization to access the "${plan.table}" data. This is part of our system-level security protocols.`,
                debug: { plan, deniedTable: plan.table, allowedTables: allowed },
            });
        }

        let queryResult: any[];
        try {
            queryResult = await executeQueryPlan(plan, user.userId, user.ownerID, user.role);
        }
        catch (err: any) {
            console.error("Query execution error:", err);
            return NextResponse.json({
                answer: "I encountered a technical issue while retrieving that information. I've logged the error, but in the meantime, perhaps you could rephrase your question?",
                debug: { plan, error: err.message },
            });
        }

        // this is the stage 2 where llm answers
        const resultStr = JSON.stringify(queryResult, null, 2);
        const truncatedResult = resultStr.length > 3000 ? resultStr.slice(0, 3000) + "\n... (truncated)" : resultStr;

        const answerPrompt = `You are a helpful and professional business intelligence assistant for READI.
                                The user is logged in as ${user.name} with role ${user.role}.
                                The user asked: "${question}"

                                Database query result:
                                ${truncatedResult}

                                Instructions:
                                - Answer directly using the provided database results.
                                - DO NOT give business advice, recommendations, or suggest "next steps" (like contacting people).
                                - SKIP all "fluff" or introductory preamble.
                                - DO NOT mention database names, table structures, or SQL.
                                - If no data was found ([]), simply state "No matching training records found" or equivalent.
                                - If data exists, format it as a clean list or clear summary.
                                - Be professional, factual, and extremely concise. Just check and tell.`;

        const answerRes = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 500,
            messages: [{ role: "user", content: answerPrompt }],
        });

        return NextResponse.json({
            answer: answerRes.choices[0].message.content,
            debug: {
                plan,
                rowCount: queryResult?.length ?? 0,
                role: user.role,
                userId: user.userId,
            },
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