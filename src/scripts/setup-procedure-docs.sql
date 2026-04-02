-- Table to store procedure documents as renderable HTML pages
-- Each row = one section of a source document (e.g., "Maintenance FRD Section 8")

CREATE TABLE IF NOT EXISTS procedure_document (
    id SERIAL PRIMARY KEY,
    doc_key TEXT UNIQUE NOT NULL,           -- e.g. "mnt_frd_8" or "manual_3"
    source_file TEXT NOT NULL,              -- e.g. "new-details.docx" or "powerpoint.pdf"
    section_title TEXT NOT NULL,            -- e.g. "Maintenance Ticket Flow"
    section_number TEXT,                    -- e.g. "8" or "GO.02.04"
    html_content TEXT NOT NULL,             -- full HTML of this section
    plain_text TEXT NOT NULL,               -- plain text version for embedding
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by doc_key (used in citation links)
CREATE INDEX IF NOT EXISTS idx_procedure_doc_key ON procedure_document(doc_key);
