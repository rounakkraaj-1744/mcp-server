"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Database } from "lucide-react";
import { Message } from "@/types";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function send() {
    if (!input.trim() || loading)
      return;

    const q = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.answer ?? data.error },
      ]);
    }
    catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Failed to connect to the server." },
      ]);
    }
    finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center gap-3 px-6 py-4 bg-white border-b shadow-sm">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Database className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Schema Explorer</h1>
          <p className="text-xs text-slate-500">Query your database architecture</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-50">
            <Bot className="w-12 h-12 mb-2" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs">Ask about tables, relations, or column types.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"
            }`} >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.role === "user" ? "bg-blue-600" : "bg-slate-200"
              }`}>
              {m.role === "user" ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-slate-600" />
              )}
            </div>

            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${m.role === "user"
                ? "bg-blue-600 text-white rounded-tr-none"
                : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
              }`}>
              <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-none shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t">
        <div className="max-w-4xl mx-auto relative flex items-center">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="e.g. List all foreign keys in the orders table..." className="w-full bg-slate-100 border-none rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          <button onClick={send} disabled={loading || !input.trim()} className="absolute right-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          AI-generated responses may contain inaccuracies.
        </p>
      </div>
    </div>
  )
}