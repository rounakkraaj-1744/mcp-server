import { getSupabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

async function getDocument(id: string) {
    const { data, error } = await getSupabase()
        .from("procedure_document")
        .select("*")
        .eq("doc_key", id)
        .single();

    if (error || !data) return null;
    return data;
}

export default async function DocViewerPage({ params }: PageProps) {
    const { id } = await params;
    const doc = await getDocument(id);

    if (!doc) notFound();

    return (
        <div className="doc-page">
            <div className="doc-container">
                {/* Back link */}
                <a href="/agent" className="back-link">
                    ← Back to READI Agent
                </a>

                {/* Header Card */}
                <div className="doc-header">
                    <div className="doc-badge">{doc.source_file}</div>
                    <h1>{doc.section_title}</h1>
                    <p className="section-meta">Section {doc.section_number}</p>
                </div>

                {/* Content */}
                <div
                    className="doc-body"
                    dangerouslySetInnerHTML={{ __html: doc.html_content }}
                />

                {/* Footer */}
                <div className="doc-footer">
                    <span>Source: {doc.source_file}</span>
                    <span className="doc-key">{doc.doc_key}</span>
                </div>
            </div>

            <style>{`
                .doc-page {
                    min-height: 100vh;
                    background: #0a0a0f;
                    color: #e2e8f0;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }

                .doc-container {
                    max-width: 820px;
                    margin: 0 auto;
                    padding: 32px 24px 64px;
                }

                .back-link {
                    display: inline-block;
                    color: #60a5fa;
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 24px;
                    transition: color 0.2s;
                }
                .back-link:hover { color: #93bbfc; }

                .doc-header {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 16px;
                    padding: 32px 36px;
                    margin-bottom: 36px;
                }

                .doc-badge {
                    display: inline-block;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1.2px;
                    color: #60a5fa;
                    background: rgba(96, 165, 250, 0.1);
                    border: 1px solid rgba(96, 165, 250, 0.2);
                    padding: 4px 12px;
                    border-radius: 6px;
                    margin-bottom: 16px;
                }

                .doc-header h1 {
                    font-size: 26px;
                    font-weight: 700;
                    color: #f1f5f9;
                    margin: 0 0 8px 0;
                    line-height: 1.3;
                }

                .section-meta {
                    font-size: 13px;
                    color: #64748b;
                    margin: 0;
                }

                /* ── Body Content ── */
                .doc-body {
                    line-height: 1.75;
                    font-size: 15px;
                    color: #cbd5e1;
                }

                .doc-body article > h1 { display: none; }

                .doc-body h2 {
                    font-size: 20px;
                    font-weight: 600;
                    color: #f1f5f9;
                    margin: 32px 0 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }

                .doc-body p {
                    margin: 10px 0;
                }

                .doc-body strong {
                    font-weight: 600;
                    color: #f1f5f9;
                }

                .doc-body ul, .doc-body ol {
                    padding-left: 20px;
                    margin: 8px 0;
                }

                .doc-body li {
                    margin: 6px 0;
                    padding-left: 4px;
                }

                .doc-body li::marker {
                    color: #3b82f6;
                }

                /* ── Tables ── */
                .doc-body table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    font-size: 13px;
                    border-radius: 10px;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.08);
                }

                .doc-body table tr:first-child td,
                .doc-body table tr:first-child th {
                    background: rgba(96, 165, 250, 0.08);
                    color: #93c5fd;
                    font-weight: 600;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .doc-body table td,
                .doc-body table th {
                    padding: 10px 16px;
                    text-align: left;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                    vertical-align: top;
                }

                .doc-body table tr:nth-child(even) {
                    background: rgba(255,255,255,0.015);
                }

                .doc-body table tr:hover {
                    background: rgba(255,255,255,0.03);
                }

                /* Hide empty rows */
                .doc-body table tr:has(td:empty:only-child),
                .doc-body table td:empty { padding: 2px 16px; }
                .doc-body table tr:not(:has(td:not(:empty))) { display: none; }

                .doc-body table td:first-child {
                    font-weight: 500;
                    color: #e2e8f0;
                    white-space: nowrap;
                }

                /* ── Footer ── */
                .doc-footer {
                    margin-top: 48px;
                    padding-top: 16px;
                    border-top: 1px solid rgba(255,255,255,0.06);
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    color: #475569;
                }

                .doc-key {
                    font-family: 'SF Mono', 'Fira Code', monospace;
                    background: rgba(255,255,255,0.04);
                    padding: 2px 8px;
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
}