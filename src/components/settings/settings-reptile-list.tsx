"use client";

import { UserPlus, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reptile } from "@/lib/store";
import { User } from "@supabase/supabase-js";
import { SettingsView } from "@/app/settings/page";

interface SettingsReptileListProps {
    reptiles: Reptile[];
    setView: (view: SettingsView) => void;
    onEdit: (id: string) => void;
    onDelete: (reptile: { id: string, name: string }) => void;
    onResetForm: () => void;
    onSignIn: () => void;
    session: { user: User } | null;
    t: (key: any) => string;
}

export function SettingsReptileList({
    reptiles,
    setView,
    onEdit,
    onDelete,
    onResetForm,
    onSignIn,
    session,
    t
}: SettingsReptileListProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">{t("settings.your_reptiles")}</h2>
                <Button size="sm" onClick={() => {
                    if (!session) {
                        onSignIn();
                        return;
                    }
                    onResetForm();
                    setView("add_reptile");
                }} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    {t("common.add")}
                </Button>
            </div>

            <div className="grid gap-3">
                {reptiles.map(r => (
                    <div
                        key={r.id}
                        onClick={() => onEdit(r.id)}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-500/10 border border-[var(--border)] group hover:border-[var(--primary)]/30 transition-all cursor-pointer relative"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-500/20 flex items-center justify-center border border-[var(--border)] shrink-0">
                                {r.avatar.startsWith('data:') || r.avatar.startsWith('http') ? (
                                    <img src={r.avatar} alt={r.name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-2xl">{r.avatar}</span>
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold text-[var(--foreground)] truncate">{r.name}</p>
                                <p className="text-xs text-[var(--muted)] truncate">{r.species}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {reptiles.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete({ id: r.id, name: r.name });
                                    }}
                                    className="p-2.5 text-red-400/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all md:opacity-0 md:group-hover:opacity-100"
                                    title={t("common.delete")}
                                >
                                    <Trash2 className="h-4.5 w-4.5" />
                                </button>
                            )}
                            <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
