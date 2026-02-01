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
    const [oauthLoading, setOauthLoading] = useState<"google" | "kakao" | null>(null);
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
                const { data, error } = await supabase.auth.signUp({
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

                if (data.session) {
                    onClose();
                } else {
                    alert("가입 확인 이메일을 보냈습니다. 이메일을 확인해주세요!");
                    onClose();
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = async (provider: "google" | "kakao") => {
        setOauthLoading(provider);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            setOauthLoading(null);
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

                {/* OAuth Buttons */}
                <div className="space-y-3 mb-6">
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={oauthLoading !== null}
                        onClick={() => handleOAuthLogin("google")}
                        className="w-full border-[var(--border)] hover:bg-[var(--muted)]/10 h-11"
                    >
                        {oauthLoading === "google" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                        )}
                        Google로 계속하기
                    </Button>

                    <Button
                        type="button"
                        variant="secondary"
                        disabled={oauthLoading !== null}
                        onClick={() => handleOAuthLogin("kakao")}
                        className="w-full border-[var(--border)] hover:bg-[var(--muted)]/10 h-11"
                        style={{ backgroundColor: "#FEE500", color: "#000000" }}
                    >
                        {oauthLoading === "kakao" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                <path
                                    fill="#000000"
                                    d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 8.06l1.47-1.424a.472.472 0 00-.656-.678l-1.928 1.866V9.282a.472.472 0 00-.944 0v2.557a.471.471 0 000 .222V13.5a.472.472 0 00.944 0v-1.363l.427-.413 1.428 2.033a.472.472 0 10.773-.543l-1.514-2.154zm-2.958 1.924h-1.46V9.297a.472.472 0 00-.943 0v4.159c0 .26.21.472.471.472h1.932a.472.472 0 100-.944zm-5.857-1.092l.696-1.707.638 1.707H9.092zm2.523.488l.002-.016a.469.469 0 00-.127-.32l-1.325-3.573a.588.588 0 00-.544-.394.588.588 0 00-.544.394L7.776 12.07a.469.469 0 00.127.32l.002.016a.472.472 0 00.849-.195l.319-.848h1.767l.32.848a.472.472 0 10.882-.336zm-5.553 1.087l2.058-4.237a.472.472 0 00-.849-.412l-1.605 3.305-1.605-3.305a.472.472 0 10-.849.412l2.058 4.237a.538.538 0 00.396.212.538.538 0 00.396-.212z"
                                />
                            </svg>
                        )}
                        카카오로 계속하기
                    </Button>
                </div>

                <div className="relative flex items-center justify-center mb-6">
                    <div className="absolute inset-x-0 h-px bg-[var(--border)]"></div>
                    <span className="relative bg-[var(--card)] px-3 text-xs text-[var(--muted)] uppercase">
                        또는 이메일로 계속
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === "signup" && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                                이름
                            </label>
                            <Input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="표시될 이름"
                                required
                                className="bg-[var(--background)] border-[var(--border)]"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                            이메일
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
                            비밀번호
                        </label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="6자 이상"
                            required
                            minLength={6}
                            className="bg-[var(--background)] border-[var(--border)]"
                        />
                    </div>

                    {error && (
                        <p className="text-xs font-bold text-red-500 animate-pulse">
                            {error}
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--primary)] text-white hover:opacity-90 font-bold"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {mode === "login" ? "로그인" : "계정 만들기"}
                    </Button>
                </form>

                <div className="mt-6 text-center text-xs">
                    <span className="text-[var(--muted)]">
                        {mode === "login"
                            ? "계정이 없으신가요? "
                            : "이미 계정이 있으신가요? "}
                    </span>
                    <button
                        onClick={() => setMode(mode === "login" ? "signup" : "login")}
                        className="font-bold text-[var(--primary)] hover:underline"
                    >
                        {mode === "login" ? "회원가입" : "로그인"}
                    </button>
                </div>
            </Card>
        </div>
    );
}
