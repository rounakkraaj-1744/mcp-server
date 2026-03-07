import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function upsertChunks(chunks: Array<{ id: string; vector: number[]; text: string; meta: { table?: string; column?: string; kind?: string }; }>) {
    const { error } = await supabase.from("schema_chunks").upsert(
        chunks.map(c => ({
            id: c.id,
            content: c.text,
            embedding: c.vector,
            table_name: c.meta.table ?? null,
            column_name: c.meta.column ?? null,
            kind: c.meta.kind ?? null,
        })),
        {
            onConflict: "id"
        }
    );
    if (error)
        throw error;
}

export async function searchSimilar(queryVector: number[], topK = 5) {
    const { data, error } = await supabase.rpc("match_schema_chunks", {
        query_embedding: queryVector,
        match_count: topK,
    });
    if (error)
        throw error;
    return (data ?? []).map((r: any) => ({
        text: r.content,
        score: r.similarity,
        meta: {
            table: r.table_name,
            column: r.column_name,
            kind: r.kind
        },
    }));
}