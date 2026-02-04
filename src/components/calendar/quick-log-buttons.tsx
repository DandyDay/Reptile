"use client";

import { Droplets, Sparkles, SprayCan } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { LogType, Reptile } from "@/lib/store";
import { cn } from "@/lib/utils";

interface QuickLogButtonsProps {
    onQuickAdd: (type: LogType) => void;
    currentReptile: Reptile | null;
}

export function QuickLogButtons({ onQuickAdd, currentReptile }: QuickLogButtonsProps) {
    const { t } = useTranslation();

    const buttons = [
        {
            type: 'poop',
            label: "calendar.poop",
            icon: Droplets,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            border: "hover:border-purple-500/50"
        },
        {
            type: 'misting',
            label: "calendar.misting", // Need to add translation key or hardcode for now
            icon: SprayCan,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "hover:border-blue-500/50"
        },
        {
            type: 'cleaning',
            label: "calendar.cleaning",
            icon: Sparkles,
            color: "text-green-500",
            bg: "bg-green-500/10",
            border: "hover:border-green-500/50"
        }
    ] as const;

    return (
        <div className="grid grid-cols-3 gap-3 mb-6">
            {buttons.map((btn) => (
                <button
                    key={btn.type}
                    onClick={() => onQuickAdd(btn.type as any)}
                    className={cn(
                        "flex flex-row items-center justify-center gap-2 p-3 rounded-2xl border border-[var(--border)] transition-all active:scale-95",
                        "bg-slate-500/5 hover:bg-slate-500/10",
                        btn.border
                    )}
                >
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", btn.bg, btn.color)}>
                        <btn.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-[var(--muted)]">
                        {t(btn.label as any)}
                    </span>
                </button>
            ))}
        </div>
    );
}
