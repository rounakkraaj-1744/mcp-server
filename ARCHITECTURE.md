# READI Agent: Technical Architecture

This document outlines the RAG (Retrieval-Augmented Generation) infrastructure designed for dynamic procedural knowledge management.

## 5. Architecture Diagram

![System Architecture](/public/image.png)

## 1. System High-Level Overview

The system utilizes a serverless architecture to ingest, embed, and retrieve technical manuals and procedural documents. It bypasses traditional blob storage by converting documents into a searchable mathematical vector space.

## 2. Ingestion Workflow
When a file (PDF or TXT) is uploaded through the Knowledge Config dashboard:

1.  **Parsing:** The serverless function (`/api/ingest`) uses `pdf-parse` for deterministic text extraction.
2.  **Chunking:** Text is segmented into granular sections to maintain semantic context and ensure LLM window efficiency.
3.  **Vectorization:** Each chunk is passed to the **Gemini `text-embedding-001`** model to generate a 768-dimensional vector representation.
4.  **Persistence:**
    *   **Text Layer:** Stored in `procedure_document` (PostgreSQL) for literal retrieval and UI rendering.
    *   **Semantic Layer:** Vectors are stored in `schema_chunks` (pgvector) for cosine similarity searches.

## 3. Retrieval-Augmented Generation (RAG)
When a user queries the agent:

*   **Intent Classification:** The system determines if the query requires procedural knowledge.
*   **Vector Search:** The query is embedded on-the-fly and matched against the `schema_chunks` table.
*   **Context Injection:** The top-K relevant chunks are retrieved and injected into the prompt of the **Llama 3.3 70B** model.
*   **Traceability:** The agent generates citations by mapping the vector results back to the `source_file` in the `procedure_document` table.

## 4. Technical Stack
| Layer | Technology |
|---|---|
| Infrastructure | Next.js 16 + Vercel Serverless |
| Database | Supabase (PostgreSQL + pgvector) |
| Embeddings | Google Gemini AI |
| Synthesis | Groq (Llama 3.3 70B) |
| PDF Engine | PDFParse (Legacy Build) |

---
*Created for the READI Agent Technical Audit.*
