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

        const planPrompt = `You are a database query planner for a drone operations platform called READI.
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

                            Rules:
                            - For "how many" questions, use aggregation: "COUNT"
                            - For "total" / "sum" questions, use aggregation: "SUM" with the appropriate aggregation_column
                            - For "average" questions, use aggregation: "AVG" with the appropriate aggregation_column
                            - For "list" / "show" questions, use aggregation: "LIST" with the relevant select_columns
                            - Always pick the most relevant table from the schema
                            - Use date_filter when the question mentions time periods
                            - Use extra_filter for status or category filtering (e.g. status_name = "Completed")

                            SCHEMA FOR ROLE ${user.role}:
                            ${schemaDoc}

                            USER QUESTION: ${question}

                            Output ONLY valid JSON. No explanation. No markdown backticks.`;

        const planRes = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
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
            return NextResponse.json({
                answer: "I couldn't understand how to query the database for that question. Could you rephrase it?",
                debug: { rawPlan: planText },
            });
        }

        const allowed = ROLE_ALLOWED_TABLES[user.role] ?? [];
        if (!allowed.includes(plan.table)) {
            return NextResponse.json({
                answer: `I don't have access to that information for your role (${user.role}). Try asking about something within your area.`,
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
                answer: "There was an error querying the database. Please try rephrasing your question.",
                debug: { plan, error: err.message },
            });
        }

        // this is the stage 2 where llm answers
        const resultStr = JSON.stringify(queryResult, null, 2);
        const truncatedResult = resultStr.length > 3000 ? resultStr.slice(0, 3000) + "\n... (truncated)" : resultStr;

        const answerPrompt = `You are a helpful assistant for a drone operations platform called READI.
                                The user is logged in as ${user.name} with role ${user.role}.
                                The user asked: "${question}"

                                Database query result:
                                ${truncatedResult}

                                Instructions:
                                - Answer clearly and concisely in natural language
                                - Do NOT mention SQL, tables, columns, or database internals
                                - Format lists nicely if there are multiple results
                                - If the result is empty ([]), say no matching data was found
                                - If the result has a count, mention the number directly
                                - Be professional and helpful`;

        const answerRes = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
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