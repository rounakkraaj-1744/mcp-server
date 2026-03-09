"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Shield, ChevronDown } from "lucide-react";
import { Message, UserSession } from "@/lib/types";
import { DUMMY_USERS_LIST, ROLE_SUGGESTIONS, ROLE_COLORS } from "@/lib/constants";

export default function AgentPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserSession>(DUMMY_USERS_LIST[0]);
    const [showUserPicker, setShowUserPicker] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current)
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, loading]);

    async function send(question?: string) {
        const q = (question ?? input).trim();
        if (!q || loading) return;

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
                { role: "assistant", content: data.answer ?? data.error ?? "No response." },
            ]);
        } catch {
            setMessages((m) => [
                ...m,
                { role: "assistant", content: "Failed to connect to the server." },
            ]);
        } finally {
            setLoading(false);
        }
    }

    function switchUser(user: UserSession) {
        setCurrentUser(user);
        setShowUserPicker(false);
        setMessages([]);
    }

    const suggestions = ROLE_SUGGESTIONS[currentUser.role] ?? [];
    const roleColor = ROLE_COLORS[currentUser.role] ?? "bg-slate-600";

    return (
        <div className="flex flex-col h-screen bg-[#0a0e1a] text-white">
            <header className="flex items-center gap-3 px-6 py-3 bg-[#0f1320] border-b border-[#1a2035]">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg">
                    <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                    <h1 className="text-base font-semibold tracking-tight text-white">
                        READI Agent
                    </h1>
                    <p className="text-[11px] text-slate-500">
                        Role-aware AI assistant
                    </p>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowUserPicker(!showUserPicker)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#141829] border border-[#1f2840] rounded-lg hover:bg-[#1a2035] transition-colors"
                    >
                        <span className={`w-5 h-5 rounded-full ${roleColor} flex items-center justify-center text-[10px]`}>
                            {currentUser.name[0]}
                        </span>
                        <span className="text-xs text-slate-300">{currentUser.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#1a2035] rounded text-slate-400 font-mono">
                            {currentUser.role}
                        </span>
                        <ChevronDown className="w-3 h-3 text-slate-500" />
                    </button>

                    {showUserPicker && (
                        <div className="absolute right-0 top-full mt-1 w-64 bg-[#141829] border border-[#1f2840] rounded-lg shadow-2xl z-50 py-1 max-h-80 overflow-y-auto">
                            {DUMMY_USERS_LIST.map((u) => (
                                <button
                                    key={u.email}
                                    onClick={() => switchUser(u)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#1a2035] transition-colors ${u.email === currentUser.email ? "bg-[#1a2035]" : ""
                                        }`}
                                >
                                    <span className={`w-5 h-5 rounded-full ${ROLE_COLORS[u.role] ?? "bg-slate-600"} flex items-center justify-center text-[10px]`}>
                                        {u.name[0]}
                                    </span>
                                    <span className="text-xs text-slate-300 flex-1">{u.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-[#0f1320] rounded text-slate-500 font-mono">
                                        {u.role}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 scroll-smooth">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                        <div className="space-y-2">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center mx-auto">
                                <Bot className="w-7 h-7 text-blue-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-300">
                                Hello, {currentUser.name}!
                            </p>
                            <p className="text-xs text-slate-500 max-w-sm">
                                Ask me anything about your data. I&apos;ll query the database based on your {currentUser.role} permissions.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => send(s)}
                                    className="px-3 py-1.5 text-xs text-slate-400 bg-[#141829] border border-[#1f2840] rounded-lg hover:bg-[#1a2035] hover:text-slate-300 hover:border-blue-500/30 transition-all"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${m.role === "user"
                            ? roleColor
                            : "bg-[#1a2035] border border-[#1f2840]"
                            }`}>
                            {m.role === "user" ? (
                                <User className="w-4 h-4 text-white" />
                            ) : (
                                <Bot className="w-4 h-4 text-blue-400" />
                            )}
                        </div>
                        <div
                            className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${m.role === "user"
                                ? `${roleColor} text-white rounded-tr-none`
                                : "bg-[#141829] border border-[#1f2840] text-slate-300 rounded-tl-none"
                                }`}>
                            <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1a2035] border border-[#1f2840] flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        </div>
                        <div className="bg-[#141829] border border-[#1f2840] px-4 py-2.5 rounded-2xl rounded-tl-none shadow-sm">
                            <div className="flex gap-1.5">
                                <span className="w-1.5 h-1.5 bg-blue-400/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 bg-blue-400/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 bg-blue-400/40 rounded-full animate-bounce" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-[#0f1320] border-t border-[#1a2035]">
                <div className="max-w-4xl mx-auto relative flex items-center">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && send()}
                        placeholder={`Ask about your ${currentUser.role} data...`}
                        className="w-full bg-[#141829] border border-[#1f2840] rounded-xl py-3 pl-4 pr-12 text-sm text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
                    />
                    <button
                        onClick={() => send()}
                        disabled={loading || !input.trim()}
                        className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 transition-all"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-[10px] text-center text-slate-600 mt-2">
                    READI Agent · Role: {currentUser.role} · Groq llama-3.1-8b-instant
                </p>
            </div>
        </div>
    );
}