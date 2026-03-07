import { schemaToChunks } from "../lib/schema/definitions";
import { embedBatch } from "../lib/embeddings/generate";
import { upsertChunks } from "../lib/vectorstore/supabase";

async function main() {
    console.log("Ingesting schema...");

    const chunks = schemaToChunks();
    console.log("  " + chunks.length + " chunks");

    const vectors = await embedBatch(chunks.map(c => c.text));
    console.log("  " + vectors[0].length + "-dim embeddings done");

    await upsertChunks(chunks.map((c, i) => ({ ...c, vector: vectors[i] })));
    console.log("Done — " + chunks.length + " rows in Supabase");
}

main().catch(err => { console.error(err); process.exit(1); });