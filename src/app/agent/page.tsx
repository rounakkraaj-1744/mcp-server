"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Bot, User, ShieldAlert, Sparkles, ChevronDown, Sun, Moon, Copy, Edit, Check, FileText, Settings } from "lucide-react";
import { Message, UserSession } from "@/lib/types";
import { DUMMY_USERS_LIST, ROLE_SUGGESTIONS } from "@/lib/constants";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function Typewriter({ text, onComplete }: { text: string; onComplete?: () => void }) {
    const [displayedText, setDisplayedText] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const speed = 10; 

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText((prev) => prev + text[currentIndex]);
                setCurrentIndex((prev) => prev + 1);
            }, speed);
            return () => clearTimeout(timeout);
        } else if (onComplete) {
            onComplete();
        }
    }, [currentIndex, text, onComplete]);

    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {displayedText}
        </ReactMarkdown>
    );
}

export default function AgentPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [currentUser, setCurrentUser] = useState<UserSession>(DUMMY_USERS_LIST[0]);
    const router = useRouter();
    const [showUserPicker, setShowUserPicker] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const savedTheme = localStorage.getItem("readi-theme");
        if (savedTheme === "light") {
            setIsDarkMode(false);
            document.documentElement.classList.remove("dark");
        }
        else {
            setIsDarkMode(true);
            document.documentElement.classList.add("dark");
        }
    }, []);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        if (isDarkMode) {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("readi-theme", "light");
        }
        else {
            document.documentElement.classList.add("dark");
            localStorage.setItem("readi-theme", "dark");
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isInputFocused = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
            if (!isInputFocused && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && inputRef.current) {
                inputRef.current.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior
            });
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading, scrollToBottom]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (loading) scrollToBottom("auto");
        }, 100);
        return () => clearInterval(interval);
    }, [loading, scrollToBottom]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
        }
    }, [input]);

    const handleSend = async (question?: string) => {
        const q = (question ?? input).trim();
        if (!q || loading)
            return;

        setInput("");
        setMessages((m) => [...m, { role: "user", content: q }]);
        setLoading(true);

        try {
            const res = await fetch("/api/agent/ask", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-email": currentUser.email,
                },
                body: JSON.stringify({ question: q }),
            });
            const data = await res.json();
            
            setMessages((m) => [
                ...m,
                {
                    role: "assistant",
                    content: data.answer ?? data.error ?? "No response.",
                    references: data.references || [],
                },
            ]);
        } 
        catch {
            setMessages((m) => [...m, { role: "assistant", content: "Failed to connect to the server." }]);
        }
        finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const startEditing = (index: number) => {
        setEditingIndex(index);
        setEditValue(messages[index].content);
    };

    const saveEdit = (index: number) => {
        const updated = [...messages];
        updated[index].content = editValue;
        setMessages(updated.slice(0, index + 1)); 
        setEditingIndex(null);
        if (messages[index].role === "user") 
            handleSend(editValue);
    };

    const switchUser = (user: UserSession) => {
        setCurrentUser(user);
        setShowUserPicker(false);
        setMessages([]);
    };

    const suggestions = ROLE_SUGGESTIONS[currentUser.role] ?? [];

    return (
        <div className={cn(
            "fixed inset-0 transition-colors duration-500 font-sans selection:bg-blue-500/10",
            isDarkMode ? "bg-[#050505] text-white" : "bg-white text-slate-900"
        )}>
            <div className={cn(
                "absolute inset-0 z-0 opacity-[0.03] pointer-events-none",
                isDarkMode ? "bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" : "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"
            )} />

            <header className={cn(
                "relative z-40 flex items-center justify-between h-14 px-6 border-b",
                isDarkMode ? "bg-[#050505]/80 border-white/5 backdrop-blur-xl" : "bg-white/80 border-slate-100 backdrop-blur-xl"
            )}>
                <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold tracking-[0.2em] uppercase">Readi</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <button
                            onClick={() => setShowUserPicker(!showUserPicker)}
                            className={cn(
                                "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                isDarkMode ? "hover:bg-white/5 text-slate-400" : "hover:bg-slate-50 text-slate-500"
                            )}
                        >
                            <User size={12} />
                            <span>{currentUser.name}</span>
                            <ChevronDown className={cn("w-3 h-3 opacity-50 transition-transform cursor-pointer", showUserPicker && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                            {showUserPicker && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowUserPicker(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={cn(
                                            "absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-2xl z-50 overflow-hidden",
                                            isDarkMode ? "bg-[#111111] border-white/10" : "bg-white border-slate-200"
                                        )}
                                    >
                                        <div className="p-1.5">
                                            {DUMMY_USERS_LIST.map((u) => (
                                                <button
                                                    key={u.email}
                                                    onClick={() => switchUser(u)}
                                                    className={cn(
                                                        "w-full cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-[11px]",
                                                        u.email === currentUser.email 
                                                            ? (isDarkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-900") 
                                                            : (isDarkMode ? "hover:bg-white/5 text-slate-300" : "hover:bg-slate-50 text-slate-700")
                                                    )}
                                                >
                                                    {u.name}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    <button 
                        onClick={() => router.push("/config")}
                        className={cn(
                            "p-2 rounded-lg transition-all cursor-pointer",
                            isDarkMode ? "hover:bg-white/5 text-slate-400" : "hover:bg-slate-50 text-slate-400"
                        )}
                        title="Knowledge Config"
                    >
                        <Settings size={14} />
                    </button>

                    <button 
                        onClick={toggleTheme}
                        className={cn(
                            "p-2 rounded-lg transition-all cursor-pointer",
                            isDarkMode ? "hover:bg-white/5 text-slate-400" : "hover:bg-slate-50 text-slate-400"
                        )}
                    >
                        {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                </div>
            </header>

            <main className="relative z-10 mx-auto max-w-3xl h-[calc(100vh-56px)] flex flex-col pt-4">
                
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-4 py-8 space-y-10 no-scrollbar"
                >
                    <AnimatePresence mode="popLayout">
                        {messages.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center h-full text-center space-y-12"
                            >
                                <div className="space-y-4">
                                    <h2 className="text-2xl font-medium tracking-tight opacity-80">How can I assist you?</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full px-8">
                                    {suggestions.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => handleSend(s)}
                                            className={cn(
                                                "p-4 rounded-xl border text-[13px] text-left transition-all active:scale-95",
                                                isDarkMode 
                                                    ? "bg-white/2 border-white/5 hover:border-white/10 hover:bg-white/4" 
                                                    : "bg-slate-50 border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <p className="opacity-60 leading-relaxed">{s}</p>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            messages.map((m, i) => (
                                <motion.div 
                                    key={i}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn("group flex gap-5 w-full", m.role === "user" ? "flex-row-reverse" : "flex-row")}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                        m.role === "user" ? "bg-blue-600" : (isDarkMode ? "bg-white/5" : "bg-slate-100")
                                    )}>
                                        {m.role === "user" ? <User size={14} className="text-white" /> : <Bot size={14} className="opacity-60" />}
                                    </div>

                                    <div className={cn("relative group max-w-[85%] sm:max-w-[80%]")}>
                                        <div className={cn(
                                            "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2",
                                            m.role === "user" ? "right-full mr-3" : "left-full ml-3"
                                        )}>
                                            <button onClick={() => copyToClipboard(m.content, i)} className="p-1 hover:text-blue-500 transition-colors cursor-pointer">
                                                {copiedIndex === i ? <Check size={12} /> : <Copy size={12} />}
                                            </button>
                                            {m.role === "user" && (
                                                <button onClick={() => startEditing(i)} className="p-1 hover:text-blue-500 transition-colors cursor-pointer">
                                                    <Edit size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <div className={cn(
                                            "text-sm leading-[1.7] tracking-wide",
                                            m.role === "user" 
                                                ? (isDarkMode ? "bg-white/10 px-4 py-2.5 rounded-2xl rounded-tr-none text-white" : "bg-slate-100 px-4 py-2.5 rounded-2xl rounded-tr-none text-slate-800")
                                                : "opacity-90"
                                        )}>
                                            {editingIndex === i ? (
                                                <div className="flex flex-col gap-3 min-w-[200px]">
                                                    <textarea 
                                                        value={editValue} 
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        autoFocus
                                                        className="w-full bg-white/5 p-3 rounded-xl border border-white/10 outline-none resize-none min-h-[80px]"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setEditingIndex(null)} className="text-[10px] font-bold uppercase opacity-50 px-3 py-1 cursor-pointer">Cancel</button>
                                                        <button onClick={() => saveEdit(i)} className="text-[10px] font-bold uppercase text-blue-500 px-3 py-1 cursor-pointer">Save</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                m.role === "assistant" ? (
                                                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-0 prose-pre:my-4 prose-pre:bg-white/[0.03] prose-pre:border-white/5">
                                                        {i === messages.length - 1 && loading === false ? (
                                                            <Typewriter text={m.content} onComplete={() => scrollToBottom()} />
                                                        ) : (
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {m.content}
                                                            </ReactMarkdown>
                                                        )}
                                                        {/* Reference Links */}
                                                        {m.references && m.references.length > 0 && (
                                                            <div className={cn(
                                                                "mt-3 pt-3 border-t flex flex-col gap-1.5",
                                                                isDarkMode ? "border-white/10" : "border-slate-200"
                                                            )}>
                                                                <span className={cn(
                                                                    "text-[10px] font-semibold uppercase tracking-wider",
                                                                    isDarkMode ? "text-white/40" : "text-slate-400"
                                                                )}>References</span>
                                                                {m.references.map((ref, ri) => (
                                                                    <a
                                                                        key={ri}
                                                                        href={ref.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={cn(
                                                                            "flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg transition-colors no-underline",
                                                                            isDarkMode
                                                                                ? "text-blue-400 hover:bg-white/5"
                                                                                : "text-blue-600 hover:bg-blue-50"
                                                                        )}
                                                                    >
                                                                        <FileText className="w-3 h-3 shrink-0" />
                                                                        <span>{ref.title}</span>
                                                                        <span className="opacity-40">({ref.source})</span>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : <p className="whitespace-pre-wrap">{m.content}</p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>

                    {loading && (
                        <div className="flex gap-5 animate-pulse">
                            <div className={cn("w-8 h-8 rounded-lg shrink-0", isDarkMode ? "bg-white/5" : "bg-slate-100")} />
                            <div className="flex items-center gap-1">
                                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} className="h-4" />
                </div>

                <div className="pb-10 pt-4 px-6">
                    <div className="max-w-2xl mx-auto">
                        <div className={cn(
                            "group relative flex items-end gap-3 p-1.5 px-4 rounded-2xl border transition-all duration-300",
                            isDarkMode ? "bg-neutral-700/50 border-white/5 focus-within:border-white/20" : "bg-slate-100 border-slate-200 focus-within:border-slate-400"
                        )}>
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Message READI AI..."
                                rows={1}
                                className="flex-1 bg-transparent resize-none py-3.5 text-[14px] outline-none"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={loading || !input.trim()}
                                className={cn(
                                    "mb-2 p-1.5 rounded-lg transition-all cursor-pointer",
                                    input.trim() && !loading ? "text-blue-500" : "opacity-20 cursor-not-allowed"
                                )}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <div className="flex justify-center mt-4">
                             <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">
                                <ShieldAlert size={10} /> Secure Protocol Active
                             </p>
                        </div>
                    </div>
                </div>
            </main>

            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                /* Custom Prose tweaks for minimal look */
                .prose pre { border-radius: 12px; font-family: 'JetBrains Mono', monospace; font-size: 13px; }
                .prose code { color: #3b82f6; background: transparent; padding: 0; }
                .prose p { line-height: 1.8; margin-bottom: 1.5rem; }
            `}} />
        </div>
    );
}