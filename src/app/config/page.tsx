"use client";

import { useState, useEffect } from "react";
import { 
    Upload, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    ArrowLeft, 
    Trash2, 
    ExternalLink,
    Search,
    RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface DocumentRecord {
    doc_key: string;
    section_title: string;
    source_file: string;
    created_at: string;
}

export default function ConfigPage() {
    const [isDarkMode] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [documents, setDocuments] = useState<DocumentRecord[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setIsLoadingDocs(true);
        try {
            const res = await fetch("/api/ingest");
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.documents || []);
            }
        } catch (err) {
            console.error("Failed to fetch documents:", err);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus("processing");
        setErrorMsg("");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/ingest", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                setUploadStatus("success");
                fetchDocuments();
                setTimeout(() => setUploadStatus("idle"), 3000);
            } else {
                const data = await res.json();
                setUploadStatus("error");
                setErrorMsg(data.error || "Upload failed");
            }
        } catch (err) {
            setUploadStatus("error");
            setErrorMsg("Network error during upload");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);

        try {
            const res = await fetch(`/api/ingest?source=${encodeURIComponent(deleteTarget)}`, {
                method: "DELETE"
            });
            if (res.ok) {
                fetchDocuments();
                setDeleteTarget(null);
            }
        } catch (err) {
            console.error("Delete failed:", err);
        } finally {
            setIsDeleting(false);
        }
    };

    const groupedDocs = documents.reduce((acc, doc) => {
        if (!acc[doc.source_file]) acc[doc.source_file] = [];
        acc[doc.source_file].push(doc);
        return acc;
    }, {} as Record<string, DocumentRecord[]>);

    const filteredSources = Object.keys(groupedDocs).filter(source => 
        source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        groupedDocs[source].some(d => d.section_title.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className={cn(
            "min-h-screen selection:bg-blue-500/30 overflow-x-hidden",
            isDarkMode ? "bg-[#0a0e1a] text-white" : "bg-slate-50 text-slate-900",
        )}>
            <div className={cn(
                "transition-all duration-700 min-h-screen",
                deleteTarget ? "blur-md scale-[0.98] pointer-events-none opacity-40" : "blur-0 scale-100"
            )}>
                <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:-2s]" />
                </div>

                <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/5 bg-[#0a0e1a]/80">
                    <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => router.push("/agent")}
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600/20 rounded-lg">
                                    <RefreshCw className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold tracking-tight">Knowledge Config</h1>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Dynamic Procedural Store</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto px-6 py-10 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-[#0f172a] border border-white/5 p-6 rounded-3xl shadow-xl">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                                    <Upload className="w-4 h-4" />
                                    Ingest New Manual
                                </h2>

                                <label className={cn(
                                    "relative block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300",
                                    isUploading ? "pointer-events-none opacity-50" : "hover:border-blue-500/50 hover:bg-blue-500/5",
                                    uploadStatus === "processing" ? "border-blue-500/50" : "border-white/10"
                                )}>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept=".pdf,.txt"
                                        onChange={handleFileUpload}
                                    />
                                    
                                    <div className="space-y-4">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-blue-500/10 group-hover:scale-110 transition-all">
                                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Drop PDF or Text file</p>
                                            <p className="text-xs text-slate-500 mt-1">Manuals, checklists, or PRDs</p>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {uploadStatus !== "idle" && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="mt-6 p-4 rounded-xl bg-black/40 backdrop-blur-md"
                                            >
                                                {uploadStatus === "processing" && (
                                                    <div className="flex items-center justify-center gap-3 text-blue-400">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">Processing Knowledge...</span>
                                                    </div>
                                                )}
                                                {uploadStatus === "success" && (
                                                    <div className="flex items-center justify-center gap-3 text-emerald-400">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">Ingested Successfully</span>
                                                    </div>
                                                )}
                                                {uploadStatus === "error" && (
                                                    <div className="flex flex-col items-center gap-2 text-rose-400">
                                                        <div className="flex items-center gap-2">
                                                            <AlertCircle className="w-4 h-4" />
                                                            <span className="text-xs font-bold uppercase tracking-wider">Error Occurred</span>
                                                        </div>
                                                        <p className="text-[10px] opacity-70 italic">{errorMsg}</p>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </label>

                                <div className="mt-8 space-y-4">
                                    <div className="p-4 bg-white/2 border border-white/5 rounded-2xl">
                                        <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2">Instructions</h4>
                                        <ul className="text-[11px] text-slate-400 space-y-2">
                                            <li>• PDFs will be parsed and Chunked by page.</li>
                                            <li>• Text files are split by multi-line breaks.</li>
                                            <li>• Embeddings are generated using Gemini.</li>
                                            <li>• Documents are instantly searchable by the agent.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-[#0f172a] border border-white/5 rounded-3xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Active Knowledge Store
                                    </h2>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                        <input 
                                            type="text" 
                                            placeholder="Search manuals..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all w-48 md:w-64"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
                                    {isLoadingDocs ? (
                                        <div className="flex flex-col items-center justify-center h-full py-20 text-slate-500">
                                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                            <p className="text-xs font-medium italic">Loading knowledge base...</p>
                                        </div>
                                    ) : filteredSources.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full py-20 text-slate-500">
                                            <div className="w-16 h-16 bg-white/2 rounded-full flex items-center justify-center mb-4">
                                                <FileText className="w-8 h-8 opacity-20" />
                                            </div>
                                            <p className="text-xs font-medium italic">No manuals found matching your search.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-white/5">
                                            {filteredSources.map(source => (
                                                <div key={source} className="p-6 hover:bg-white/1 transition-colors group">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-4">
                                                            <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-all">
                                                                <FileText className="w-5 h-5 text-blue-400" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
                                                                    {source}
                                                                </h3>
                                                                <div className="flex items-center gap-3 mt-1.5">
                                                                    <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-slate-400">
                                                                        {groupedDocs[source].length} sections
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-500">
                                                                        Updated {new Date(groupedDocs[source][0].created_at).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                            <button 
                                                                onClick={() => setDeleteTarget(source)}
                                                                className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-400 transition-all"
                                                                title="Delete knowledge from this file"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 pl-14">
                                                        {groupedDocs[source].slice(0, 4).map(doc => (
                                                            <a 
                                                                key={doc.doc_key}
                                                                href={`/docs/${doc.doc_key}`}
                                                                target="_blank"
                                                                className="flex items-center justify-between p-2.5 bg-white/2 hover:bg-white/5 border border-white/5 rounded-xl text-[11px] text-slate-400 hover:text-white transition-all group/item"
                                                            >
                                                                <span className="truncate pr-2">{doc.section_title || "Untitled Section"}</span>
                                                                <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                            </a>
                                                        ))}
                                                        {groupedDocs[source].length > 4 && (
                                                            <div className="p-2.5 text-[10px] text-slate-600 font-medium italic">
                                                                + {groupedDocs[source].length - 4} more sections...
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <AnimatePresence mode="wait">
                {deleteTarget && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteTarget(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-xl"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-md bg-[#0f172a]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-[0_0_50px_-12px_rgba(244,63,94,0.4)]"
                        >
                            <div className="w-20 h-20 bg-rose-500/15 rounded-3xl flex items-center justify-center mb-8 mx-auto ring-1 ring-rose-500/30">
                                <Trash2 className="w-10 h-10 text-rose-400" />
                            </div>
                            <h2 className="text-2xl font-black mb-3 text-center tracking-tight">Erase Knowledge?</h2>
                            <p className="text-slate-400 text-sm mb-10 text-center leading-relaxed">
                                You are about to permanently remove <span className="text-white font-bold underline decoration-rose-500/50 underline-offset-4">"{deleteTarget}"</span> and its {groupedDocs[deleteTarget]?.length} processed sections.
                            </p>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setDeleteTarget(null)}
                                    className="cursor-pointer flex-1 px-6 py-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 font-bold text-[10px] uppercase tracking-[0.2em] transition-all"
                                >
                                    Cancel
                                </button>
                                <button onClick={handleDelete} disabled={isDeleting} className="cursor-pointer flex-1 px-6 py-4 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center gap-2">
                                    {isDeleting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        "Confirm"
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}