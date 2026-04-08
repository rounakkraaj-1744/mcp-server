import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { embedBatch } from "@/lib/embeddings/generate";
import { upsertChunks } from "@/lib/vectorstore/supabase";

export async function GET() {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("procedure_document")
            .select("doc_key, section_title, source_file, created_at")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ documents: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
    // Polyfill globals needed by pdfjs-dist before importing
    if (typeof (globalThis as any).DOMMatrix === 'undefined') {
        (globalThis as any).DOMMatrix = class {};
    }
    if (typeof (globalThis as any).Path2D === 'undefined') {
        (globalThis as any).Path2D = class {};
    }
    if (typeof (globalThis as any).ImageData === 'undefined') {
        (globalThis as any).ImageData = class {};
    }

    // Dynamic import — only loaded when actually needed
    const { PDFParse } = await import("pdf-parse");
    const path = await import("path");

    const workerPath = path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
    PDFParse.setWorker(workerPath);

    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let textContent = "";
        let chunks: string[] = [];

        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
            try {
                textContent = await extractPdfText(buffer);
            } catch (pdfErr: any) {
                console.error("PDF parse error:", pdfErr);
                return NextResponse.json({ error: `PDF parsing failed: ${pdfErr.message}` }, { status: 500 });
            }
            chunks = textContent.split(/\n\s*\n/).filter(c => c.trim().length > 50);
        } else {
            textContent = new TextDecoder().decode(buffer);
            chunks = textContent.split(/\n\s*\n/).filter(c => c.trim().length > 50);
        }

        if (chunks.length === 0) {
            return NextResponse.json({ error: "No readable content found in file" }, { status: 400 });
        }

        const supabase = getSupabase();
        const batchId = Date.now().toString();
        const sourceFile = file.name;

        // 1. Prepare Procedure Documents (HTML View)
        const procedureDocs = chunks.map((chunk, i) => {
            const sectionTitle = chunk.split("\n")[0].slice(0, 100).trim() || `Section ${i + 1}`;
            return {
                doc_key: `dyn_${batchId}_${i}`,
                source_file: sourceFile,
                section_title: sectionTitle,
                section_number: `${i + 1}`,
                html_content: `<article><h1>${sectionTitle}</h1><p>${chunk.replace(/\n/g, "<br/>")}</p></article>`,
                plain_text: chunk
            };
        });

        const { error: procError } = await supabase
            .from("procedure_document")
            .upsert(procedureDocs);

        if (procError) throw procError;

        // 2. Prepare Vector Chunks (Embedding)
        console.log(`Generating embeddings for ${chunks.length} chunks...`);
        const vectors = await embedBatch(chunks);

        const vectorChunks = chunks.map((chunk, i) => ({
            id: `dyn_chunk_${batchId}_${i}`,
            text: chunk,
            vector: vectors[i],
            meta: {
                table: "dynamic_knowledge",
                kind: "procedural"
            }
        }));

        await upsertChunks(vectorChunks);

        return NextResponse.json({ 
            success: true, 
            sections: chunks.length 
        });

    } catch (error: any) {
        console.error("Ingestion Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const source = searchParams.get("source");

        if (!source) {
            return NextResponse.json({ error: "Source file name required" }, { status: 400 });
        }

        const supabase = getSupabase();

        // 1. Get doc_keys before deleting so we can find the matching vector chunks
        const { data: docsToDelete } = await supabase
            .from("procedure_document")
            .select("doc_key")
            .eq("source_file", source);

        // 2. Delete from procedure_document
        const { error: procError } = await supabase
            .from("procedure_document")
            .delete()
            .eq("source_file", source);

        if (procError) throw procError;

        // 3. Delete matching vector chunks from schema_chunks
        if (docsToDelete && docsToDelete.length > 0) {
            const chunkIds = docsToDelete.map(d => {
                return d.doc_key.replace(/^dyn_/, "dyn_chunk_");
            });

            const { error: chunkError } = await supabase
                .from("schema_chunks")
                .delete()
                .in("id", chunkIds);

            if (chunkError) {
                console.error("Failed to delete vector chunks:", chunkError);
            } else {
                console.log(`Deleted ${chunkIds.length} vector chunks for "${source}"`);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
