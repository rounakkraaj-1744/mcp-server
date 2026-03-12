"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, ArrowRight, Loader2, AlertCircle } from "lucide-react";

const CREDENTIALS = {
    user: "@dm1n_777",
    pass: "22@dspwqer#745",
};

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        const auth = localStorage.getItem("is_authenticated");
        if (auth === "true") router.push("/");
    }, [router]);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        await new Promise(r => setTimeout(r, 800));

        if (username === CREDENTIALS.user && password === CREDENTIALS.pass) {
            localStorage.setItem("is_authenticated", "true");
            localStorage.setItem("logged_in_at", new Date().toISOString());
            router.push("/agent");
        }
        else {
            setError("Invalid username or password");
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0e1a] text-white p-6 selection:bg-blue-500/30">
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:-2s]" />
            </div>

            <div className="w-full max-w-md z-10">
                <div className="flex flex-col items-center mb-8 space-y-4">
                    <div className="p-4 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/20">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                            READI Operations
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            Authorized personnel only
                        </p>
                    </div>
                </div>

                <div className="bg-[#0f1320] border border-[#1a2035] p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                                Username
                            </label>
                            <div className="relative group/field font-mono">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within/field:text-blue-400" />
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="@user_id"
                                    className="w-full bg-[#141829] border border-[#1f2840] rounded-xl py-3.5 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all hover:bg-[#1a2035]"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                                Password
                            </label>
                            <div className="relative group/field font-mono text-xs">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within/field:text-blue-400" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-[#141829] border border-[#1f2840] rounded-xl py-3.5 pl-11 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all hover:bg-[#1a2035]"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500 font-medium animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative group/btn bg-gradient-to-r from-blue-600 to-cyan-500 py-3.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 overflow-hidden"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    Authenticate
                                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-xs text-slate-600">
                    Proprietary system for authorized drone ops.
                    <br />
                    READI Agent Portal © 2026.
                </p>
            </div>
        </div>
    );
}
