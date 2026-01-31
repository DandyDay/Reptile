"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Loader2 } from "lucide-react";

interface AuthDialogProps {
    onClose: () => void;
}

export function AuthDialog({ onClose }: AuthDialogProps) {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onClose();
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                        data: {
                            full_name: fullName,
                            avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${fullName}`,
                        },
                    },
                });
                if (error) throw error;
                alert("Check your email for the confirmation link!");
                onClose();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <Card className="relative w-full max-w-sm overflow-hidden border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                    <X size={20} />
                </button>

                <h2 className="mb-6 text-2xl font-black text-center text-[var(--foreground)]">
                    {mode === "login" ? "Welcome Back!" : "Join Community"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === "signup" && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                                Name
                            </label>
                            <Input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Displayed name"
                                required
                                className="bg-[var(--background)] border-[var(--border)]"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                            Email
                        </label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="hello@example.com"
                            required
                            className="bg-[var(--background)] border-[var(--border)]"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                            Password
                        </label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min. 6 characters"
                            required
                            minLength={6}
                            className="bg-[var(--background)] border-[var(--border)]"
                        />
                    </div>

                    {error && (
                        <p className="text-xs font-bold text-red-500 animate-pulse">
                            🚨 {error}
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--primary)] text-white hover:opacity-90 font-bold"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {mode === "login" ? "Login" : "Create Account"}
                    </Button>

                    <div className="relative flex items-center justify-center my-4">
                        <div className="absolute inset-x-0 h-px bg-[var(--border)]"></div>
                        <span className="relative bg-[var(--card)] px-2 text-xs text-[var(--muted)] uppercase">Or continue with</span>
                    </div>

                    <Button
                        type="button"
                        variant="secondary"
                        onClick={async () => {
                            setLoading(true);
                            const { error } = await supabase.auth.signInWithOAuth({
                                provider: 'google',
                                options: {
                                    redirectTo: `${window.location.origin}/auth/callback`
                                }
                            });
                            if (error) {
                                setError(error.message);
                                setLoading(false);
                            }
                        }}
                        className="w-full border-[var(--border)] hover:bg-[var(--muted)]/10"
                    >
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Google
                    </Button>
                </form>

                <div className="mt-6 text-center text-xs">
                    <span className="text-[var(--muted)]">
                        {mode === "login"
                            ? "Don't have an account? "
                            : "Already have an account? "}
                    </span>
                    <button
                        onClick={() => setMode(mode === "login" ? "signup" : "login")}
                        className="font-bold text-[var(--primary)] hover:underline"
                    >
                        {mode === "login" ? "Sign up" : "Log in"}
                    </button>
                </div>
            </Card>
        </div>
    );
}
