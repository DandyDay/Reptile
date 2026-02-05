"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
    Utensils, Droplets, Sparkles, StickyNote,
    Calendar as CalendarIcon, Clock, SprayCan
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogType, Reptile, FoodPreset, Log } from "@/lib/store";

import { TranslationKey } from "@/lib/i18n";

interface CalendarLogFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (log: any) => void;
    reptiles: Reptile[];
    currentReptile: Reptile | null;
    foodPresets: FoodPreset[];
    t: (key: TranslationKey) => string;
    initialDate: Date;
    initialLogType?: LogType;
    onToast?: (message: string, type?: 'success' | 'error') => void;
    editingLog?: Log | null;
}

export function CalendarLogForm({
    isOpen,
    onClose,
    onSubmit,
    reptiles,
    currentReptile,
    foodPresets,
    t,
    initialDate,
    initialLogType,
    onToast,
    editingLog
}: CalendarLogFormProps) {
    const [logType, setLogType] = useState<LogType>(initialLogType || 'feeding');
    const [details, setDetails] = useState("");
    const [note, setNote] = useState("");
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [quantity, setQuantity] = useState("5");
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
    const [formDate, setFormDate] = useState<Date>(initialDate);
    const [formTime, setFormTime] = useState(format(new Date(), "HH:mm"));
    const [selectedReptileId, setSelectedReptileId] = useState<string>("");
    const [weight, setWeight] = useState("");

    // Reset form when opened
    useEffect(() => {
        if (isOpen) {
            if (editingLog) {
                const date = new Date(editingLog.date);
                setDetails(editingLog.details || "");
                setNote(editingLog.note || "");
                setSelectedEmoji(editingLog.emoji || null);
                setWeight(editingLog.weight?.toString() || "");
                setSelectedPreset(null);
                setQuantity("5");
            } else {
                setFormDate(initialDate);
                setFormTime(format(new Date(), "HH:mm"));
                setSelectedReptileId(currentReptile?.id || (reptiles.length > 0 ? reptiles[0].id : ""));
                setLogType(initialLogType || 'feeding');
                setDetails("");
                setNote("");
                setSelectedPreset(null);
                setQuantity("5");
                setSelectedEmoji(null);
                setWeight("");
            }
        }
    }, [isOpen, initialDate, currentReptile, reptiles, initialLogType, editingLog]);

    const handleSubmit = () => {
        const checkDate = new Date(formDate);
        checkDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (checkDate > today && logType !== 'memo') {
            onToast?.(t("calendar.future_log_warning"), 'error');
            return;
        }

        let finalDetails = details;

        const combinedDate = new Date(formDate);
        if (['feeding', 'poop', 'cleaning'].includes(logType)) {
            combinedDate.setHours(0, 0, 0, 0);
        } else {
            const [hours, minutes] = formTime.split(':').map(Number);
            combinedDate.setHours(hours, minutes, 0, 0);
        }
        const logData = {
            id: editingLog?.id,
            type: logType,
            date: combinedDate.toISOString(),
            details: finalDetails,
            note: note,
            emoji: selectedEmoji || undefined,
            reptileId: selectedReptileId,
            weight: weight ? parseFloat(weight) : undefined
        };

        onSubmit(logData);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-xl bg-[var(--background)] rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
                    >
                        {/* Header */}
                        <div className="p-6 flex items-center justify-between border-b border-[var(--border)]/50">
                            <button onClick={onClose} className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-1">
                                {t("common.cancel")}
                            </button>
                            <h2 className="text-lg font-bold text-[var(--foreground)]">
                            </h2>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-8 pb-12">
                            {/* Reptile Selection Section */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] ml-1">{t("settings.reptile_profile")}</h3>
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                    {reptiles.map((reptile) => (
                                        <button
                                            key={reptile.id}
                                            onClick={() => setSelectedReptileId(reptile.id)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all min-w-max",
                                                selectedReptileId === reptile.id
                                                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg shadow-[var(--primary)]/30 scale-105"
                                                    : "bg-slate-500/5 border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/30"
                                            )}
                                        >
                                            {
                                                reptile.avatar.startsWith('data:') || reptile.avatar.startsWith('http') ? (
                                                    <div className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center bg-slate-500/10 border border-[var(--border)]">
                                                        <img src={reptile.avatar} alt={reptile.name} className="h-full w-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <span className="text-2xl">{reptile.avatar}</span>
                                                )
                                            }

                                            <div className="text-left">
                                                <p className={cn("text-sm font-bold", selectedReptileId === reptile.id ? "text-white" : "text-[var(--foreground)]")}>
                                                    {reptile.name}
                                                </p>
                                                <p className={cn("text-[10px] font-medium opacity-70", selectedReptileId === reptile.id ? "text-white" : "text-[var(--muted)]")}>
                                                    {reptile.species}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Record Type Section */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] ml-1">{t("calendar.log_type_title")}</h3>
                                <div className="flex justify-between items-center px-4 bg-slate-500/5 p-6 rounded-[32px] border border-[var(--border)]/30">
                                    {(['feeding', 'poop', 'cleaning', 'misting', 'memo'] as const).map((type) => {
                                        const Icon = type === 'feeding' ? Utensils :
                                            type === 'poop' ? Droplets :
                                                type === 'cleaning' ? Sparkles :
                                                    type === 'misting' ? SprayCan : StickyNote;
                                        const colors = {
                                            feeding: "rgb(249, 115, 22)",
                                            poop: "rgb(168, 85, 247)",
                                            cleaning: "rgb(34, 197, 94)",
                                            misting: "rgb(59, 130, 246)",
                                            memo: "rgb(234, 179, 8)"
                                        };
                                        const isSelected = logType === type;

                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const checkDate = new Date(formDate);
                                        checkDate.setHours(0, 0, 0, 0);
                                        const isFuture = checkDate > today;
                                        const isDisabled = isFuture && type !== 'memo';

                                        return (
                                            <div key={type} className="flex flex-col items-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        if (isDisabled) return;

                                                        setLogType(type);

                                                        // Cleaning and Poop now open form for notes (reverted auto-submit)
                                                        setLogType(type);
                                                    }}
                                                    disabled={isDisabled}
                                                    className={cn(
                                                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                                                        isSelected ? "scale-110 shadow-xl" : "opacity-30 grayscale hover:opacity-100 hover:grayscale-0",
                                                        isDisabled && "opacity-10 grayscale cursor-not-allowed hover:opacity-10 hover:grayscale"
                                                    )}
                                                    style={{
                                                        backgroundColor: colors[type],
                                                        boxShadow: isSelected ? `0 12px 24px -6px ${colors[type]}80` : 'none'
                                                    }}
                                                >
                                                    <Icon className="h-6 w-6 text-white" />
                                                </button>
                                                <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", isSelected ? "text-[var(--foreground)]" : "text-[var(--muted)]", isDisabled && "opacity-20")}>
                                                    {t(`calendar.${type}` as any)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Date and Time Section */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] ml-1">{t("calendar.date_time_title")}</h3>
                                <div className="flex gap-4">
                                    <div className="relative flex-1">
                                        <input
                                            type="date"
                                            value={format(formDate, "yyyy-MM-dd")}
                                            onChange={(e) => setFormDate(parseISO(e.target.value))}
                                            className="w-full bg-slate-500/5 border border-[var(--border)] rounded-2xl p-4 pl-12 text-sm font-bold text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] appearance-none"
                                        />
                                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--primary)] opacity-60" />
                                    </div>
                                    {!['feeding', 'poop', 'cleaning'].includes(logType) && (
                                        <div className="relative w-40 animate-in slide-in-from-right-4 duration-300">
                                            <input
                                                type="time"
                                                value={formTime}
                                                onChange={(e) => setFormTime(e.target.value)}
                                                className="w-full bg-slate-500/5 border border-[var(--border)] rounded-2xl p-4 pl-12 text-sm font-bold text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] appearance-none"
                                            />
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--primary)] opacity-60" />
                                        </div>
                                    )}

                                </div>
                            </div>

                            {/* Specific Section: Feeding */}
                            {
                                logType === 'feeding' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] ml-1">{t("calendar.food_presets")}</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {foodPresets.map(preset => (
                                                    <button
                                                        key={preset.id}
                                                        onClick={() => {
                                                            setSelectedPreset(preset.id);
                                                            setSelectedEmoji(preset.emoji);
                                                            setDetails(`${preset.emoji} ${preset.name} ${quantity}${preset.unit}`);
                                                        }}
                                                        className={cn(
                                                            "px-4 py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 shadow-sm",
                                                            selectedPreset === preset.id
                                                                ? "bg-[var(--primary)] text-white border-[var(--primary)] scale-105"
                                                                : "bg-slate-500/5 border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]/30"
                                                        )}
                                                    >
                                                        <span className="text-lg">{preset.emoji}</span> {preset.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {
                                            selectedPreset && (
                                                <div className="space-y-4">
                                                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] ml-1">{t("calendar.quantity")}</h3>
                                                    <div className="flex items-center justify-between bg-slate-500/5 border border-[var(--border)] rounded-[24px] p-2 pr-6">
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    const newQty = Math.max(1, parseInt(quantity) - 1).toString();
                                                                    setQuantity(newQty);
                                                                    const preset = foodPresets.find(p => p.id === selectedPreset);
                                                                    if (preset) setDetails(`${preset.emoji} ${preset.name} ${newQty}${preset.unit}`);
                                                                }}
                                                                className="h-12 w-12 rounded-2xl bg-[var(--background)] flex items-center justify-center text-xl font-black text-[var(--foreground)] shadow-sm active:scale-90 transition-transform"
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={quantity}
                                                                onChange={(e) => {
                                                                    setQuantity(e.target.value);
                                                                    const preset = foodPresets.find(p => p.id === selectedPreset);
                                                                    if (preset) setDetails(`${preset.emoji} ${preset.name} ${e.target.value}${preset.unit}`);
                                                                }}
                                                                className="w-20 bg-transparent text-center text-xl font-black text-[var(--foreground)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const newQty = (parseInt(quantity) + 1).toString();
                                                                    setQuantity(newQty);
                                                                    const preset = foodPresets.find(p => p.id === selectedPreset);
                                                                    if (preset) setDetails(`${preset.emoji} ${preset.name} ${newQty}${preset.unit}`);
                                                                }}
                                                                className="h-12 w-12 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-xl font-black text-white shadow-lg shadow-[var(--primary)]/20 active:scale-95 transition-transform"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                        <span className="text-xs font-black text-[var(--muted)] uppercase tracking-widest ml-4">
                                                            {foodPresets.find(p => p.id === selectedPreset)?.unit}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] ml-1">
                                                {t("calendar.weight")} <span className="text-[10px] opacity-60 normal-case">(Optional)</span>
                                            </h3>
                                            <div className="flex items-center justify-between bg-slate-500/5 border border-[var(--border)] rounded-[24px] p-2 pr-6">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => {
                                                            const current = weight ? parseFloat(weight) : 0;
                                                            const newQty = Math.max(0, current - 1).toString();
                                                            setWeight(newQty === "0" ? "" : newQty);
                                                        }}
                                                        className="h-12 w-12 rounded-2xl bg-[var(--background)] flex items-center justify-center text-xl font-black text-[var(--foreground)] shadow-sm active:scale-90 transition-transform"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={weight}
                                                        onChange={(e) => setWeight(e.target.value)}
                                                        placeholder="0"
                                                        className="w-20 bg-transparent text-center text-xl font-black text-[var(--foreground)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-[var(--muted)]/30"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const current = weight ? parseFloat(weight) : 0;
                                                            setWeight((current + 1).toString());
                                                        }}
                                                        className="h-12 w-12 rounded-2xl bg-[var(--background)] flex items-center justify-center text-xl font-black text-[var(--foreground)] shadow-sm active:scale-90 transition-transform"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <span className="text-xs font-black text-[var(--muted)] uppercase tracking-widest ml-4">
                                                    g
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] ml-1">{t("calendar.details")}</h3>
                                            <input
                                                className="w-full rounded-2xl bg-slate-500/5 border border-[var(--border)] p-4 text-sm font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
                                                placeholder={t("calendar.placeholder_feeding")}
                                                value={details}
                                                onChange={e => setDetails(e.target.value)}
                                            />
                                        </div>
                                    </div >
                                )
                            }

                            {/* Common: Details/Notes */}
                            {
                                logType !== 'feeding' && logType !== 'weight' && (
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] ml-1">
                                            {logType === 'memo' ? t("calendar.memo_content") : t("calendar.details")}
                                        </h3>
                                        {logType === 'memo' ? (
                                            <textarea
                                                className="w-full rounded-2xl bg-slate-500/5 border border-[var(--border)] p-4 text-sm font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none min-h-[120px] resize-none"
                                                placeholder={t("calendar.placeholder_memo")}
                                                value={details}
                                                onChange={e => setDetails(e.target.value)}
                                            />
                                        ) : (
                                            <input
                                                className="w-full rounded-2xl bg-slate-500/5 border border-[var(--border)] p-4 text-sm font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
                                                placeholder={
                                                    logType === 'poop' ? t("calendar.placeholder_details_poop") :
                                                        t("calendar.placeholder_details_cleaning")
                                                }
                                                value={details}
                                                onChange={e => setDetails(e.target.value)}
                                            />
                                        )}

                                    </div>
                                )
                            }

                            <Button
                                onClick={handleSubmit}
                                className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-[var(--primary)]/20 mt-4"
                            >
                                {t("common.save")}
                            </Button>
                        </div >
                    </motion.div >
                </div >
            )
            }
        </AnimatePresence >
    );
}
