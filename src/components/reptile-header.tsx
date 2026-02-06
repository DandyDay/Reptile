"use client";

import { useReptileLogs } from "@/lib/store";
import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

import { NotificationButton } from "./notification-button";

export function ReptileHeader() {
    const { reptiles, selectedReptileId, setSelectedReptileId } = useReptileLogs();
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-black tracking-tight">My Reptiles</h2>
                <div className="flex items-center gap-2">
                    <NotificationButton />
                </div>
            </div>

            <div className="flex w-full items-center gap-4 overflow-x-auto py-2 px-1 scrollbar-none -mx-1">
                {/* Reptile list */}
                {reptiles.map((reptile) => {
                    const isSelected = selectedReptileId === reptile.id;
                    // Check if avatar is an emoji (short string) or an image URL (long string starting with data:)
                    const isImage = reptile.avatar.startsWith("data:") || reptile.avatar.startsWith("http");

                    return (
                        <button
                            key={reptile.id}
                            onClick={() => setSelectedReptileId(reptile.id)}
                            className="flex flex-col items-center gap-1 min-w-[72px]"
                        >
                            <div className={cn(
                                "relative flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all overflow-hidden bg-[var(--card)]",
                                isSelected
                                    ? "border-[var(--primary)] shadow-[0_0_15px_var(--primary-half)] scale-110"
                                    : "border-[var(--border)] opacity-70 hover:opacity-100 hover:scale-105"
                            )}>
                                {isImage ? (
                                    <img src={reptile.avatar} alt={reptile.name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-3xl select-none">{reptile.avatar}</span>
                                )}
                            </div>
                            <span className={cn(
                                "text-xs font-medium truncate w-full text-center transition-colors",
                                isSelected ? "text-[var(--primary)]" : "text-[var(--muted)]"
                            )}>
                                {reptile.name}
                            </span>
                        </button>
                    );
                })}

                {/* Add New Button */}
                <Link href="/settings?view=add_reptile" className="flex flex-col items-center gap-1 min-w-[64px] group">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[var(--border)] bg-[var(--card)] text-[var(--muted)] transition-all group-hover:border-[var(--primary)] group-hover:text-[var(--primary)]">
                        <Plus className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-medium text-[var(--muted)] group-hover:text-[var(--primary)]">{t("common.add")}</span>
                </Link>
            </div>
        </div>
    );
}
