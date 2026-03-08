import { pipeline, env } from "@xenova/transformers";

env.cacheDir = "/tmp/transformers-cache";

let _embedder: any = null;

async function getEmbedder() {
    if (!_embedder) {
        _embedder = await pipeline(
            "feature-extraction",
            "Xenova/all-MiniLM-L6-v2"
        );
    }
    return _embedder;
}

export async function embedText(text: string): Promise<number[]> {
    const embedder = await getEmbedder();
    const out = await embedder(text, { pooling: "mean", normalize: true });
    return Array.from(out.data as Float32Array);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(embedText));
}