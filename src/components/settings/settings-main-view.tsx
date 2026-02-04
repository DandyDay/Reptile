"use client";

import { User } from "@supabase/supabase-js";
import {
    User as UserIcon, ChevronRight, Users, Palette,
    Database, LogOut, UserPlus
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { SettingsView } from "@/app/settings/page";

interface SettingsMainViewProps {
    setView: (view: SettingsView) => void;
    t: (key: any) => string;
    session: { user: User } | null;
    profileData: {
        name: string;
        bio: string;
        avatar: string;
    };
    reptileCount: number;
    onSignOut: () => Promise<any>;
    onSignIn: () => void;
}

export function SettingsMainView({
    setView,
    t,
    session,
    profileData,
    reptileCount,
    onSignOut,
    onSignIn
}: SettingsMainViewProps) {
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Profile Card */}
            {session && (
                <Card
                    className="p-4 border-[var(--border)] hover:border-[var(--primary)] transition-all cursor-pointer group"
                    onClick={() => setView("profile")}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-slate-500/10 flex items-center justify-center overflow-hidden border-2 border-[var(--border)] group-hover:border-[var(--primary)] transition-colors">
                                {profileData.avatar ? (
                                    <img src={profileData.avatar} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <UserIcon className="h-7 w-7 text-[var(--muted)]" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--foreground)]">
                                    {profileData.name || session.user.email?.split('@')[0] || "내 프로필"}
                                </h3>
                                <p className="text-xs text-[var(--muted)]">
                                    {profileData.bio || "프로필을 설정해주세요"}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
                    </div>
                </Card>
            )}

            <div className="grid gap-4">
                <Card
                    className="p-4 border-[var(--border)] hover:border-[var(--primary)] transition-all cursor-pointer group"
                    onClick={() => setView("reptiles")}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-slate-500/10 text-[var(--primary)] group-hover:scale-110 transition-transform">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--foreground)]">{t("settings.sections.reptiles")}</h3>
                                <p className="text-xs text-[var(--muted)]">{reptileCount} {t("settings.your_reptiles")}</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
                    </div>
                </Card>

                <Card
                    className="p-4 border-[var(--border)] hover:border-[var(--primary)] transition-all cursor-pointer group"
                    onClick={() => setView("appearance")}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-slate-500/10 text-pink-400 group-hover:scale-110 transition-transform">
                                <Palette className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--foreground)]">{t("settings.sections.appearance")}</h3>
                                <p className="text-xs text-[var(--muted)]">{t("settings.theme")}, {t("settings.language")}</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
                    </div>
                </Card>

                <Card
                    className="p-4 border-[var(--border)] hover:border-[var(--primary)] transition-all cursor-pointer group"
                    onClick={() => setView("data")}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-slate-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                                <Database className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--foreground)]">{t("settings.sections.data")}</h3>
                                <p className="text-xs text-[var(--muted)]">{t("calendar.manage_presets")}</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
                    </div>
                </Card>
            </div>

            {session ? (
                <button
                    onClick={onSignOut}
                    className="w-full p-4 rounded-xl flex items-center justify-center gap-2 text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold text-sm"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out ({session.user.email})
                </button>
            ) : (
                <button
                    onClick={onSignIn}
                    className="w-full p-4 rounded-xl flex items-center justify-center gap-2 text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 transition-all font-bold text-sm"
                >
                    <UserPlus className="h-4 w-4" />
                    Sign In / Sign Up
                </button>
            )}
        </div>
    );
}
