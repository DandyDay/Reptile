"use client";

import React, { useState } from "react";
import { useReptileLogs } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronRight, Check } from "lucide-react";

interface OnboardingWizardProps {
    onComplete: () => void;
}

const PRESET_OPTIONS = [
    { id: "cricket", key: "cricket", emoji: "🦗", unit: "마리" }, // default unit fallback
    { id: "mealworm", key: "mealworm", emoji: "🐛", unit: "마리" },
    { id: "dubia", key: "dubia", emoji: "🪳", unit: "마리" },
    { id: "superworm", key: "superworm", emoji: "🌭", unit: "마리" },
    { id: "mouse", key: "mouse", emoji: "🐁", unit: "마리" },
    { id: "vegetable", key: "vegetable", emoji: "🥬", unit: "g" },
    { id: "fruit", key: "fruit", emoji: "🍎", unit: "g" },
    { id: "calcium", key: "calcium", emoji: "💊", unit: "g" },
    { id: "vitamin", key: "vitamin", emoji: "🧪", unit: "g" },
] as const;

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
    const { addReptile, addFoodPreset } = useReptileLogs();
    const { t } = useTranslation();
    const [step, setStep] = useState<"welcome" | "reptile" | "presets">("welcome");

    // Reptile Form State
    const [name, setName] = useState("");
    const [species, setSpecies] = useState("");
    const [avatar, setAvatar] = useState("🦎");

    // Preset Selection State
    const [selectedPresets, setSelectedPresets] = useState<string[]>(["cricket", "calcium"]); // Default selection

    const handleAddReptile = () => {
        if (!name.trim()) return;

        addReptile({
            name,
            species,
            avatar,
            color: "emerald", // Default color
        });

        // Setup default presets
        selectedPresets.forEach(presetKey => {
            const preset = PRESET_OPTIONS.find(p => p.key === presetKey);
            if (preset) {
                addFoodPreset({
                    name: t(`onboarding.presets.${presetKey}` as any),
                    emoji: preset.emoji,
                    unit: preset.unit as any
                });
            }
        });

        onComplete();
    };

    const nextStep = () => {
        if (step === "welcome") setStep("reptile");
        else if (step === "reptile") setStep("presets");
        else if (step === "presets") handleAddReptile();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-[var(--background)] border border-[var(--border)] rounded-[32px] overflow-hidden shadow-2xl"
            >
                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {step === "welcome" && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center text-center space-y-6"
                            >
                                <div className="text-6xl animate-bounce">👋</div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black text-[var(--foreground)]">{t("onboarding.welcome_title")}</h2>
                                    <p className="text-sm text-[var(--muted)] leading-relaxed whitespace-pre-wrap">
                                        {t("onboarding.welcome_desc")}
                                    </p>
                                </div>
                                <Button onClick={nextStep} className="w-full h-14 rounded-2xl text-lg font-bold mt-4">
                                    {t("onboarding.start")}
                                </Button>
                            </motion.div>
                        )}

                        {step === "reptile" && (
                            <motion.div
                                key="reptile"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-1 mb-6">
                                    <h2 className="text-xl font-black">{t("onboarding.add_first_reptile")}</h2>
                                    <p className="text-xs text-[var(--muted)]">{t("onboarding.step_reptile")}</p>
                                </div>

                                <div className="flex justify-center mb-6">
                                    <div className="relative group">
                                        <div className="h-24 w-24 rounded-full bg-slate-500/10 flex items-center justify-center text-5xl border-2 border-[var(--border)] overflow-hidden">
                                            {avatar.startsWith("data:") || avatar.startsWith("http") ? (
                                                <img src={avatar} className="h-full w-full object-cover" />
                                            ) : (
                                                avatar
                                            )}
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full cursor-pointer">
                                            <span className="text-xs font-bold text-white">Change</span>
                                        </div>
                                        {/* Simplified avatar picker for onboarding - cycle emojis for now or just fixed */}
                                        <select
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => setAvatar(e.target.value)}
                                            value={avatar}
                                        >
                                            {["🦎", "🐍", "🐢", "🐸", "🐊", "🦖"].map(em => (
                                                <option key={em} value={em}>{em}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-[var(--muted)] ml-1">{t("settings.name")}</label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t("onboarding.reptile_name_placeholder")}
                                            className="h-14 rounded-2xl bg-slate-500/5 text-lg font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-[var(--muted)] ml-1">{t("settings.species")}</label>
                                        <Input
                                            value={species}
                                            onChange={(e) => setSpecies(e.target.value)}
                                            placeholder={t("onboarding.reptile_species_placeholder")}
                                            className="h-14 rounded-2xl bg-slate-500/5 text-base font-medium"
                                        />
                                    </div>
                                </div>

                                <Button
                                    onClick={nextStep}
                                    disabled={!name.trim()}
                                    className="w-full h-14 rounded-2xl text-lg font-bold mt-4"
                                >
                                    {t("onboarding.next")} <ChevronRight className="ml-2 h-5 w-5" />
                                </Button>
                            </motion.div>
                        )}

                        {step === "presets" && (
                            <motion.div
                                key="presets"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-1 mb-2">
                                    <h2 className="text-xl font-black">{t("onboarding.select_presets_title")}</h2>
                                    <p className="text-xs text-[var(--muted)] whitespace-pre-wrap">{t("onboarding.select_presets_desc")}</p>
                                </div>

                                <div className="grid grid-cols-3 gap-2 max-h-[40vh] overflow-y-auto p-1">
                                    {PRESET_OPTIONS.map((preset) => (
                                        <button
                                            key={preset.key}
                                            onClick={() => {
                                                if (selectedPresets.includes(preset.key)) {
                                                    setSelectedPresets(prev => prev.filter(k => k !== preset.key));
                                                } else {
                                                    setSelectedPresets(prev => [...prev, preset.key]);
                                                }
                                            }}
                                            className={cn(
                                                "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all aspect-square",
                                                selectedPresets.includes(preset.key)
                                                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg shadow-[var(--primary)]/20 scale-105"
                                                    : "bg-slate-500/5 border-[var(--border)] text-[var(--muted)] grayscale opacity-70 hover:opacity-100 hover:grayscale-0"
                                            )}
                                        >
                                            <span className="text-2xl">{preset.emoji}</span>
                                            <span className="text-[10px] font-bold text-center leading-tight">
                                                {t(`onboarding.presets.${preset.key}` as any)}
                                            </span>
                                            {selectedPresets.includes(preset.key) && (
                                                <div className="absolute top-2 right-2 h-4 w-4 bg-white/20 rounded-full flex items-center justify-center">
                                                    <Check className="h-2.5 w-2.5 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <Button
                                    onClick={handleAddReptile}
                                    className="w-full h-14 rounded-2xl text-lg font-bold mt-4"
                                >
                                    {t("onboarding.finish")}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
