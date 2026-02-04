"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Reptile } from "@/lib/store";
import { VisualSettings } from "@/lib/store";

interface SettingsReptileFormProps {
    initialData?: Reptile;
    onSubmit: (data: any) => void;
    onCancel: () => void;
    onDelete?: (id: string, name: string) => void;
    visualSettings: VisualSettings;
    onImageSelect: (file: File) => void;
    avatar: string; // Lifted up just for image preview/cropping coordination if needed, but managing local state mostly
    setAvatar: (avatar: string) => void;
    isEmojiMode: boolean;
    setIsEmojiMode: (isEmoji: boolean) => void;
    t: (key: any) => string;
}

export function SettingsReptileForm({
    initialData,
    onSubmit,
    onCancel,
    onDelete,
    visualSettings,
    onImageSelect,
    avatar,
    setAvatar,
    isEmojiMode,
    setIsEmojiMode,
    t
}: SettingsReptileFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState(initialData?.name || "");
    const [species, setSpecies] = useState(initialData?.species || "");
    const [birthday, setBirthday] = useState(initialData?.birthday || "");
    const [notes, setNotes] = useState(initialData?.notes || "");

    // Care Schedule state
    const feeding = initialData?.careSchedules?.find(s => s.type === 'feeding');
    const [feedingEnabled, setFeedingEnabled] = useState(!!feeding?.enabled);
    const [feedingMode, setFeedingMode] = useState<"interval" | "weekly">(feeding?.scheduleMode || "interval");
    const [feedingDays, setFeedingDays] = useState(feeding?.frequencyDays || 2);
    const [feedingSpecificDays, setFeedingSpecificDays] = useState<number[]>(feeding?.specificDays || []);

    const cleaning = initialData?.careSchedules?.find(s => s.type === 'cleaning');
    const [cleaningEnabled, setCleaningEnabled] = useState(!!cleaning?.enabled);
    const [cleaningMode, setCleaningMode] = useState<"interval" | "weekly">(cleaning?.scheduleMode || "interval");
    const [cleaningDays, setCleaningDays] = useState(cleaning?.frequencyDays || 7);
    const [cleaningSpecificDays, setCleaningSpecificDays] = useState<number[]>(cleaning?.specificDays || []);

    const avatars = ["🦎", "🐍", "🐢", "🐸", "🐊", "🦖", "🥚", "🐲"];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const careSchedules = [
            {
                type: 'feeding' as const,
                scheduleMode: feedingMode,
                frequencyDays: feedingMode === 'interval' ? feedingDays : undefined,
                specificDays: feedingMode === 'weekly' ? feedingSpecificDays : undefined,
                enabled: feedingEnabled
            },
            {
                type: 'cleaning' as const,
                scheduleMode: cleaningMode,
                frequencyDays: cleaningMode === 'interval' ? cleaningDays : undefined,
                specificDays: cleaningMode === 'weekly' ? cleaningSpecificDays : undefined,
                enabled: cleaningEnabled
            }
        ];

        onSubmit({
            name,
            species,
            avatar,
            birthday: birthday || undefined,
            notes: notes || undefined,
            careSchedules
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImageSelect(file);
            e.target.value = "";
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <Card className="p-6 border-[var(--primary)]/20 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Avatar Picker */}
                    <div className="flex flex-col items-center gap-4 pb-4 border-b border-[var(--border)]">
                        <div className="relative h-24 w-24 rounded-full bg-slate-500/10 ring-4 ring-[var(--border)] flex items-center justify-center overflow-hidden">
                            {avatar.startsWith("data:") || avatar.startsWith("http") ? (
                                <img src={avatar} alt="Preview" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-4xl">{avatar}</span>
                            )}
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Upload className="h-6 w-6 text-white" />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" size="sm" variant={isEmojiMode ? "primary" : "secondary"} onClick={() => setIsEmojiMode(true)} className="text-xs h-8 px-3">
                                {t("common.emoji")}
                            </Button>
                            <Button type="button" size="sm" variant={!isEmojiMode ? "primary" : "secondary"} onClick={() => fileInputRef.current?.click()} className="text-xs h-8 px-3">
                                {t("common.photo")}
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        {isEmojiMode && (
                            <div className="flex gap-2 flex-wrap justify-center max-w-xs">
                                {avatars.map(a => (
                                    <button
                                        key={a}
                                        type="button"
                                        onClick={() => { setAvatar(a); setIsEmojiMode(true); }}
                                        className={cn(
                                            "flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all",
                                            avatar === a ? "bg-[var(--primary)] text-white scale-110 shadow-lg" : "bg-slate-500/10 text-[var(--muted)] hover:bg-slate-500/20 border border-[var(--border)]"
                                        )}
                                    >
                                        {a}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--muted)]">{t("settings.name")}</label>
                            <input
                                className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] p-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                placeholder={t("settings.name_placeholder")}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--muted)]">{t("settings.species")}</label>
                            <input
                                className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] p-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                placeholder={t("settings.species_placeholder")}
                                value={species}
                                onChange={e => setSpecies(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--muted)]">{t("settings.birthday")}</label>
                            <input
                                type="date"
                                className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] p-3 text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] color-scheme-normal"
                                style={{ colorScheme: visualSettings?.theme === 'light' ? 'light' : 'dark' }}
                                value={birthday}
                                onChange={e => setBirthday(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--muted)]">{t("settings.profile_notes")}</label>
                            <textarea
                                className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] p-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] min-h-[80px]"
                                placeholder={t("settings.profile_notes_placeholder")}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        {/* Care Schedule Section */}
                        <div className="pt-4 border-t border-[var(--border)]">
                            <h3 className="text-sm font-bold text-[var(--foreground)] mb-4">{t("settings.care_schedule")}</h3>

                            <div className="space-y-4">
                                {/* Feeding Schedule */}
                                <div className="p-4 rounded-2xl bg-slate-500/5 border border-[var(--border)] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">
                                                🥗
                                            </div>
                                            <span className="text-sm font-bold text-[var(--foreground)]">{t("settings.feeding_cycle")}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFeedingEnabled(!feedingEnabled)}
                                            className={cn(
                                                "w-12 h-6 rounded-full transition-colors relative",
                                                feedingEnabled ? "bg-[var(--primary)]" : "bg-slate-500/20"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                                feedingEnabled ? "left-7" : "left-1"
                                            )} />
                                        </button>
                                    </div>

                                    {feedingEnabled && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {/* Mode Switch */}
                                            <div className="flex gap-1 bg-slate-500/10 p-1 rounded-xl">
                                                {(['interval', 'weekly'] as const).map(m => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setFeedingMode(m)}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                            feedingMode === m ? "bg-[var(--background)] text-[var(--primary)] shadow-sm" : "text-[var(--muted)]"
                                                        )}
                                                    >
                                                        {t(`settings.schedule_mode_${m}` as any)}
                                                    </button>
                                                ))}
                                            </div>

                                            {feedingMode === 'interval' ? (
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="7"
                                                        value={feedingDays}
                                                        onChange={(e) => setFeedingDays(parseInt(e.target.value))}
                                                        className="flex-1 accent-[var(--primary)]"
                                                    />
                                                    <span className="text-xs font-black text-[var(--primary)] min-w-[60px] text-right">
                                                        {t("settings.every_days").replace('{{days}}', feedingDays.toString())}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest px-1">{t("settings.select_days_desc")}</p>
                                                    <div className="flex justify-between">
                                                        {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day, i) => (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFeedingSpecificDays(prev =>
                                                                        prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
                                                                    );
                                                                }}
                                                                className={cn(
                                                                    "h-9 w-9 rounded-xl flex items-center justify-center text-[10px] font-black transition-all border",
                                                                    feedingSpecificDays.includes(i)
                                                                        ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg shadow-[var(--primary)]/20 scale-110"
                                                                        : "bg-[var(--background)] text-[var(--muted)] border-[var(--border)]"
                                                                )}
                                                            >
                                                                {t(`calendar.days.${day}` as any)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Cleaning Schedule */}
                                <div className="p-4 rounded-2xl bg-slate-500/5 border border-[var(--border)] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 font-bold">
                                                ✨
                                            </div>
                                            <span className="text-sm font-bold text-[var(--foreground)]">{t("settings.cleaning_cycle")}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCleaningEnabled(!cleaningEnabled)}
                                            className={cn(
                                                "w-12 h-6 rounded-full transition-colors relative",
                                                cleaningEnabled ? "bg-[var(--primary)]" : "bg-slate-500/20"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                                cleaningEnabled ? "left-7" : "left-1"
                                            )} />
                                        </button>
                                    </div>

                                    {cleaningEnabled && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {/* Mode Switch */}
                                            <div className="flex gap-1 bg-slate-500/10 p-1 rounded-xl">
                                                {(['interval', 'weekly'] as const).map(m => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setCleaningMode(m)}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                            cleaningMode === m ? "bg-[var(--background)] text-[var(--primary)] shadow-sm" : "text-[var(--muted)]"
                                                        )}
                                                    >
                                                        {t(`settings.schedule_mode_${m}` as any)}
                                                    </button>
                                                ))}
                                            </div>

                                            {cleaningMode === 'interval' ? (
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="7"
                                                        value={cleaningDays}
                                                        onChange={(e) => setCleaningDays(parseInt(e.target.value))}
                                                        className="flex-1 accent-[var(--primary)]"
                                                    />
                                                    <span className="text-xs font-black text-[var(--primary)] min-w-[60px] text-right">
                                                        {t("settings.every_days").replace('{{days}}', cleaningDays.toString())}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest px-1">{t("settings.select_days_desc")}</p>
                                                    <div className="flex justify-between">
                                                        {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day, i) => (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => {
                                                                    setCleaningSpecificDays(prev =>
                                                                        prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
                                                                    );
                                                                }}
                                                                className={cn(
                                                                    "h-9 w-9 rounded-xl flex items-center justify-center text-[10px] font-black transition-all border",
                                                                    cleaningSpecificDays.includes(i)
                                                                        ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg shadow-[var(--primary)]/20 scale-110"
                                                                        : "bg-[var(--background)] text-[var(--muted)] border-[var(--border)]"
                                                                )}
                                                            >
                                                                {t(`calendar.days.${day}` as any)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                            <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
                                {t("common.cancel")}
                            </Button>
                            <Button className="flex-2" type="submit">
                                {initialData ? t("common.save") : t("settings.create_profile")}
                            </Button>
                        </div>

                        {initialData && initialData && onDelete && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full text-red-500 hover:bg-red-500/10 h-10 mt-2 text-xs"
                                onClick={() => onDelete(initialData.id, name)}
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                {t("common.delete")}
                            </Button>
                        )}
                    </div>
                </form>
            </Card>
        </div>
    );
}
