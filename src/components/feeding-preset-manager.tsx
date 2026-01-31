"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Plus, Trash2, X } from "lucide-react";
import { FoodPreset, useReptileLogs } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function FeedingPresetManager() {
    const { foodPresets, addFoodPreset, deleteFoodPreset } = useReptileLogs();
    const { t, lang } = useTranslation();
    const [isAdding, setIsAdding] = useState(false);
    const [newPreset, setNewPreset] = useState({ name: "", emoji: "🦗", unit: lang === "ko" ? "마리" as const : "pieces" as const });

    const handleAdd = () => {
        if (!newPreset.name.trim()) return;
        addFoodPreset(newPreset);
        setNewPreset({ name: "", emoji: "🦗", unit: lang === "ko" ? "마리" : "pieces" });
        setIsAdding(false);
    };

    const unitOptions = lang === "ko"
        ? [{ value: "마리", label: "마리" }, { value: "g", label: "g" }, { value: "개", label: "개" }]
        : [{ value: "pieces", label: "pieces" }, { value: "grams", label: "grams" }, { value: "items", label: "items" }];

    const emojiOptions = ["🦗", "🐛", "🪳", "🥗", "🍎", "💊", "🐁", "🥚", "🍖", "🌿"];

    return (
        <Card className="p-4 border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("calendar.manage_presets")}</h3>
                {!isAdding && (
                    <Button size="sm" onClick={() => setIsAdding(true)} className="h-7 text-xs">
                        <Plus className="h-3 w-3 mr-1" /> {t("common.add")}
                    </Button>
                )}
            </div>

            {isAdding && (
                <div className="mb-3 p-3 rounded-lg bg-slate-500/10 border border-[var(--border)] space-y-3">
                    <div className="flex gap-2">
                        <select
                            value={newPreset.emoji}
                            onChange={(e) => setNewPreset({ ...newPreset, emoji: e.target.value })}
                            className="w-14 rounded-lg bg-[var(--background)] border border-[var(--border)] p-2 text-center text-lg focus:border-[var(--primary)] focus:outline-none"
                        >
                            {emojiOptions.map(emoji => (
                                <option key={emoji} value={emoji} className="bg-[var(--card)] text-[var(--foreground)]">{emoji}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder={t("calendar.preset_name")}
                            value={newPreset.name}
                            onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                            className="flex-1 rounded-lg bg-[var(--background)] border border-[var(--border)] p-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
                        />
                        <select
                            value={newPreset.unit}
                            onChange={(e) => setNewPreset({ ...newPreset, unit: e.target.value as any })}
                            className="w-20 rounded-lg bg-[var(--background)] border border-[var(--border)] p-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
                        >
                            {unitOptions.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-[var(--card)] text-[var(--foreground)]">{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="flex-1 h-8 text-xs">
                            {t("common.cancel")}
                        </Button>
                        <Button size="sm" onClick={handleAdd} className="flex-1 h-8 text-xs">
                            {t("common.save")}
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {foodPresets.map(preset => (
                    <div key={preset.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-500/5 border border-[var(--border)] group">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{preset.emoji}</span>
                            <span className="text-sm text-[var(--foreground)]">{preset.name}</span>
                            <span className="text-xs text-[var(--muted)]">({preset.unit})</span>
                        </div>
                        <button
                            onClick={() => deleteFoodPreset(preset.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--muted)] hover:text-red-400 transition-all"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </Card>
    );
}
