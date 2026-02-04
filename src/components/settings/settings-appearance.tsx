"use client";

import { Palette, Store, ChevronRight, Languages, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { VisualSettings } from "@/lib/store";
import { SettingsView } from "@/app/settings/page";

interface SettingsAppearanceProps {
    visualSettings: VisualSettings;
    setTheme: (theme: 'light' | 'dark' | 'custom') => void;
    setLanguage: (lang: 'ko' | 'en') => void;
    setCalViewMode: (mode: 'dot' | 'emoji') => void;
    setCustomColor: (key: string, value: string) => void;
    setView: (view: SettingsView) => void;
    onPublishTheme: () => void;
    showCustomColors: boolean;
    setShowCustomColors: (show: boolean) => void;
    t: (key: any) => string;
}

export function SettingsAppearance({
    visualSettings,
    setTheme,
    setLanguage,
    setCalViewMode,
    setCustomColor,
    setView,
    onPublishTheme,
    showCustomColors,
    setShowCustomColors,
    t
}: SettingsAppearanceProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <Card className="p-4 border-[var(--border)] divide-y divide-[var(--border)]">
                <div className="space-y-2 pb-6">
                    {/* Theme Selector */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <Palette className="h-5 w-5 text-pink-400" />
                            <h3 className="font-semibold text-[var(--foreground)]">{t("settings.theme")}</h3>
                        </div>

                        <div className="flex gap-1 bg-slate-500/10 p-1 rounded-lg border border-[var(--border)]">
                            {(['dark', 'light', 'custom'] as const).map((tId) => (
                                <button
                                    key={tId}
                                    onClick={() => setTheme(tId)}
                                    className={cn(
                                        "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                        visualSettings?.theme === tId ? "bg-[var(--primary)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                                    )}
                                >
                                    {t(`settings.${tId}` as any)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Theme Store Link */}
                    <button
                        onClick={() => setView("theme_store")}
                        className="w-full p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-[var(--border)] flex items-center justify-between group hover:border-pink-500/30 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                                <Store className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-[var(--foreground)]">{t("settings.theme_store")}</h3>
                                <p className="text-xs text-[var(--muted)]">Find and share custom themes</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors" />
                    </button>
                </div>

                {/* Custom Theme Editor */}
                {visualSettings?.theme === 'custom' && (
                    <div className="py-6 space-y-6">


                        <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={onPublishTheme} className="flex-1 gap-2">
                                <Store className="h-4 w-4" />
                                {t("settings.publish_theme")}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => setShowCustomColors(!showCustomColors)} className="flex-1 gap-2 border border-[var(--border)]">
                                <Palette className="h-4 w-4" />
                                {showCustomColors ? t("settings.hide_colors") : t("settings.edit_colors")}
                                <ChevronRight className={cn("h-4 w-4 transition-transform", showCustomColors && "rotate-90")} />
                            </Button>
                        </div>

                        {showCustomColors && (
                            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                                {Object.entries(visualSettings.customColors).map(([key, value]) => (
                                    <div key={key} className="space-y-1.5 p-2 rounded-lg bg-slate-500/5 border border-[var(--border)] transition-colors hover:border-[var(--primary)]/30">
                                        <label className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider block truncate">{t(`settings.colors.${key}` as any)}</label>
                                        <div className="flex items-center gap-2">
                                            <div className="relative h-7 w-10 rounded border border-[var(--border)] overflow-hidden">
                                                <input
                                                    type="color"
                                                    value={value}
                                                    onChange={(e) => setCustomColor(key, e.target.value)}
                                                    className="absolute -inset-1 h-10 w-14 cursor-pointer"
                                                />
                                            </div>
                                            <span className="text-[9px] font-mono text-[var(--muted)]">{value.toUpperCase()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Language Selector */}
                <div className="py-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Languages className="h-5 w-5 text-blue-400" />
                        <h3 className="font-semibold text-[var(--foreground)]">{t("settings.language")}</h3>
                    </div>
                    <div className="flex gap-1 bg-slate-500/10 p-1 rounded-lg border border-[var(--border)]">
                        <button
                            onClick={() => setLanguage('ko')}
                            className={cn(
                                "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                visualSettings?.language === 'ko' ? "bg-[var(--primary)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            )}
                        >
                            한국어
                        </button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={cn(
                                "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                visualSettings?.language === 'en' ? "bg-[var(--primary)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            )}
                        >
                            English
                        </button>
                    </div>
                </div>

                {/* Calendar View Mode */}
                <div className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Settings2 className="h-5 w-5 text-amber-400" />
                        <h3 className="font-semibold text-[var(--foreground)]">{t("settings.calendar_view")}</h3>
                    </div>
                    <div className="flex gap-1 bg-slate-500/10 p-1 rounded-lg border border-[var(--border)]">
                        <button
                            onClick={() => setCalViewMode('dot')}
                            className={cn(
                                "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                visualSettings?.calViewMode === 'dot' ? "bg-[var(--primary)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            )}
                        >
                            {t("settings.view_dots")}
                        </button>
                        <button
                            onClick={() => setCalViewMode('emoji')}
                            className={cn(
                                "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                visualSettings?.calViewMode === 'emoji' ? "bg-[var(--primary)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            )}
                        >
                            {t("settings.view_emojis")}
                        </button>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mt-2 italic">{t("settings.calendar_view_desc")}</p>
                </div>
            </Card>
        </div>
    );
}
