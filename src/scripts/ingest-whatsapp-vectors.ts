import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { embedBatch } from "../lib/embeddings/generate";
import { upsertChunks } from "../lib/vectorstore/supabase";

const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
        const match = line.match(/^\s*([\w.]+)\s*=\s*"?(.+?)"?\s*$/);
        if (match) process.env[match[1]] = match[2];
    }
}

async function main() {
    console.log("Ingesting WhatsApp process flow into vector store...\n");

    const filePath = resolve(process.cwd(), "../whatsapp_translated_english.txt");
    if (!existsSync(filePath)) {
        console.error("whatsapp_translated_english.txt not found. Run ingest-whatsapp-pdf.ts first.");
        return;
    }

    const content = readFileSync(filePath, "utf8");

    // Split on section separators
    const sections = content.split(/===\s+/).filter(Boolean);
    console.log(`Found ${sections.length} sections to embed.`);

    const chunks = sections.map((text, i) => {
        const cleanText = text.trim();
        const id = `pflow_${i}`;
        return {
            id,
            text: cleanText,
            vector: [] as number[],
            meta: {
                kind: "procedural" as string,
                table: "process_flow" as string
            }
        };
    });

    console.log("Generating embeddings...");
    const vectors = await embedBatch(chunks.map(c => c.text));

    const finalChunks = chunks.map((c, i) => ({
        ...c,
        vector: vectors[i]
    }));

    console.log("Upserting to vector store...");
    await upsertChunks(finalChunks);

    console.log(`✅ Done! ${finalChunks.length} process flow sections are now in the vector store.`);
}

main().catch(console.error);
