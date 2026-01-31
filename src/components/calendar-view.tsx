"use client";

import React, { useState, useEffect } from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    isToday,
    parseISO,
    differenceInCalendarDays
} from "date-fns";
import { ko, enUS } from "date-fns/locale";
import {
    ChevronLeft, ChevronRight, Plus, Trash2,
    Utensils, Droplets, Sparkles, StickyNote,
    Check, ChevronRight as ChevronRightIcon,
    Calendar as CalendarIcon, Clock, X, Scale
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { LogType, useReptileLogs } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

export function CalendarView() {
    const {
        reptiles, logs, addLog, deleteLog,
        visualSettings, foodPresets, currentReptile,
        setSelectedReptileId
    } = useReptileLogs();

    const { t, lang } = useTranslation();
    const locale = lang === 'ko' ? ko : enUS;

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form State
    const [logType, setLogType] = useState<LogType>('feeding');
    const [details, setDetails] = useState("");
    const [note, setNote] = useState("");
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [quantity, setQuantity] = useState("5");
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
    const [formDate, setFormDate] = useState<Date>(new Date());
    const [formTime, setFormTime] = useState(format(new Date(), "HH:mm"));

    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth)),
        end: endOfWeek(endOfMonth(currentMonth))
    });

    const getLogsForDate = (date: Date) => {
        return logs.filter(log =>
            log.reptileId === currentReptile?.id &&
            isSameDay(new Date(log.date), date)
        );
    };

    const dayLogs = selectedDate ? getLogsForDate(selectedDate) : [];

    const resetForm = () => {
        setIsFormOpen(false);
        setLogType('feeding');
        setDetails("");
        setNote("");
        setSelectedPreset(null);
        setQuantity("5");
        setSelectedEmoji(null);
    };

    const openForm = () => {
        const now = new Date();
        setFormDate(selectedDate || now);
        setFormTime(format(now, "HH:mm"));
        setIsFormOpen(true);
    };

    const handleSubmitLog = () => {
        if (!logType) return;

        let finalDetails = details;
        if (logType !== 'feeding' && !finalDetails) {
            if (logType === 'poop') finalDetails = t("calendar.condition_normal");
            if (logType === 'cleaning') finalDetails = t("calendar.cleaning_spot");
        }

        // Combine formDate and formTime
        const combinedDate = new Date(formDate);
        const [hours, minutes] = formTime.split(':').map(Number);
        combinedDate.setHours(hours, minutes);

        // Handle weight log specific details
        if (logType === 'weight') {
            const weightVal = parseFloat(quantity);
            if (!isNaN(weightVal)) {
                finalDetails = `${weightVal}g`;

                addLog({
                    type: logType,
                    date: combinedDate.toISOString(),
                    note,
                    details: finalDetails,
                    emoji: selectedEmoji || undefined,
                    weight: weightVal
                });
                resetForm();
                return;
            }
        }

        addLog({
            type: logType,
            date: combinedDate.toISOString(),
            details: finalDetails,
            note: note,
            emoji: selectedEmoji || undefined
        });
        resetForm();
    };

    const getLogIcon = (log: any) => {
        switch (log.type) {
            case 'feeding': return log.emoji || '🦗';
            case 'poop': return '💩';
            case 'cleaning': return '🧹';
            case 'memo': return '📝';
            case 'weight': return '⚖️';
            default: return log.type;
        }
    };

    const renderLogItem = (log: any) => (
        <div key={log.id} className="group flex flex-col gap-2 rounded-2xl bg-slate-500/5 p-4 border border-[var(--border)] transition-all hover:border-[var(--primary)]/30">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm"
                        style={{
                            backgroundColor: `color-mix(in srgb, var(--color-${log.type}), transparent 85%)`,
                            color: `var(--color-${log.type})`
                        }}
                    >
                        {getLogIcon(log)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-[var(--foreground)] text-sm tracking-tight">{t(`calendar.${log.type}` as any)}</p>
                            <span className="text-[10px] text-[var(--muted)] font-mono opacity-60">
                                {format(new Date(log.date), "HH:mm")}
                            </span>
                            {(() => {
                                if (!currentReptile?.careSchedules || !selectedDate) return null;
                                const schedule = currentReptile.careSchedules.find(s =>
                                    s.enabled &&
                                    s.type === log.type
                                );

                                // Determine if this log was scheduled or overdue
                                let badgeType: 'scheduled' | 'overdue' | null = null;

                                if (schedule) {
                                    const todayStart = new Date(selectedDate);
                                    todayStart.setHours(0, 0, 0, 0);
                                    const lastLogBeforeThis = logs
                                        .filter(l => l.reptileId === currentReptile.id && l.type === log.type && l.id !== log.id)
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .find(l => new Date(l.date) < todayStart);

                                    if (schedule.scheduleMode === 'weekly') {
                                        if (schedule.specificDays?.includes(selectedDate.getDay())) {
                                            badgeType = 'scheduled';
                                        } else {
                                            // Check if it was overdue
                                            const targetDays = [...(schedule.specificDays || [])].sort((a, b) => b - a);
                                            const currentDay = selectedDate.getDay();
                                            let lastScheduledDay = targetDays.find(d => d < currentDay);
                                            if (lastScheduledDay === undefined) lastScheduledDay = targetDays[0];
                                            const daysToSub = (currentDay - lastScheduledDay + 7) % 7 || 7;
                                            const lastScheduledDate = new Date(todayStart);
                                            lastScheduledDate.setDate(todayStart.getDate() - daysToSub);
                                            const lastLogDate = lastLogBeforeThis ? new Date(lastLogBeforeThis.date) : null;
                                            if (!lastLogDate || (lastLogDate < lastScheduledDate && !isSameDay(lastLogDate, lastScheduledDate))) {
                                                badgeType = 'overdue';
                                            }
                                        }
                                    } else if (schedule.scheduleMode === 'interval' && schedule.frequencyDays) {
                                        if (lastLogBeforeThis) {
                                            const diff = differenceInCalendarDays(selectedDate, new Date(lastLogBeforeThis.date));
                                            if (diff > 0 && diff % schedule.frequencyDays === 0) {
                                                badgeType = 'scheduled';
                                            } else if (diff > schedule.frequencyDays) {
                                                badgeType = 'overdue';
                                            }
                                        } else {
                                            badgeType = 'scheduled';
                                        }
                                    }
                                }
                                if (badgeType) {
                                    return (
                                        <div className={cn(
                                            "px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                                            badgeType === 'overdue'
                                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                                : "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20"
                                        )}>
                                            {badgeType === 'overdue' ? t("calendar.overdue_badge") : t("calendar.scheduled_tasks")}
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                        <p className="text-xs text-[var(--muted)] font-medium mt-0.5">{log.details}</p>
                    </div>
                </div>
                <button
                    onClick={() => deleteLog(log.id)}
                    className="opacity-0 group-hover:opacity-100 transition-all p-2 text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
            {log.note && (
                <div className="ml-16 bg-white/5 p-3 rounded-xl text-[11px] text-[var(--muted)] italic border border-[var(--border)]/50 leading-relaxed shadow-inner">
                    "{log.note}"
                </div>
            )}
        </div>
    );

    const renderModal = () => (
        <AnimatePresence>
            {isFormOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={resetForm}
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
                            <button onClick={resetForm} className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-1">
                                {t("common.cancel")}
                            </button>
                            <h2 className="text-lg font-bold text-[var(--foreground)]">{t("calendar.add_log")}</h2>
                            <button onClick={handleSubmitLog} className="text-sm font-bold text-[var(--primary)] hover:opacity-80 px-2 py-1">
                                {t("common.save")}
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-8 pb-12">
                            {/* Record Type Section */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] ml-1">{t("calendar.log_type_title")}</h3>
                                <div className="flex justify-between items-center px-4 bg-slate-500/5 p-6 rounded-[32px] border border-[var(--border)]/30">
                                    {(['feeding', 'poop', 'cleaning', 'weight', 'memo'] as const).map((type) => {
                                        const Icon = type === 'feeding' ? Utensils :
                                            type === 'poop' ? Droplets :
                                                type === 'cleaning' ? Sparkles :
                                                    type === 'weight' ? Scale : StickyNote;
                                        const colors = {
                                            feeding: "rgb(249, 115, 22)",
                                            poop: "rgb(168, 85, 247)",
                                            cleaning: "rgb(34, 197, 94)",
                                            weight: "rgb(59, 130, 246)", // blue-500
                                            memo: "rgb(234, 179, 8)"
                                        };
                                        const isSelected = logType === type;
                                        return (
                                            <div key={type} className="flex flex-col items-center gap-3">
                                                <button
                                                    onClick={() => setLogType(type)}
                                                    className={cn(
                                                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                                                        isSelected ? "scale-110 shadow-xl" : "opacity-30 grayscale hover:opacity-100 hover:grayscale-0"
                                                    )}
                                                    style={{
                                                        backgroundColor: colors[type],
                                                        boxShadow: isSelected ? `0 12px 24px -6px ${colors[type]}80` : 'none'
                                                    }}
                                                >
                                                    <Icon className="h-6 w-6 text-white" />
                                                </button>
                                                <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", isSelected ? "text-[var(--foreground)]" : "text-[var(--muted)]")}>
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
                                    {(logType === 'feeding' || logType === 'weight') && (
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
                            {logType === 'feeding' && (
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

                                    {selectedPreset && (
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
                                    )}

                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] ml-1">{t("calendar.details")}</h3>
                                        <input
                                            className="w-full rounded-2xl bg-slate-500/5 border border-[var(--border)] p-4 text-sm font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
                                            placeholder={t("calendar.placeholder_feeding")}
                                            value={details}
                                            onChange={e => setDetails(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {logType === 'weight' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] ml-1">
                                        {t("calendar.weight")}
                                    </h3>
                                    <div className="flex items-center justify-between bg-slate-500/5 border border-[var(--border)] rounded-[24px] p-2 pr-6">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    const newQty = Math.max(0, parseFloat(quantity) - 1).toString();
                                                    setQuantity(newQty);
                                                    setDetails(`${newQty}g`);
                                                }}
                                                className="h-12 w-12 rounded-2xl bg-[var(--background)] flex items-center justify-center text-xl font-black text-[var(--foreground)] shadow-sm active:scale-90 transition-transform"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={quantity}
                                                onChange={(e) => {
                                                    setQuantity(e.target.value);
                                                    setDetails(`${e.target.value}g`);
                                                }}
                                                className="w-20 bg-transparent text-center text-xl font-black text-[var(--foreground)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <button
                                                onClick={() => {
                                                    const newQty = (parseFloat(quantity) + 1).toString();
                                                    setQuantity(newQty);
                                                    setDetails(`${newQty}g`);
                                                }}
                                                className="h-12 w-12 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-xl font-black text-white shadow-lg shadow-[var(--primary)]/20 active:scale-95 transition-transform"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <span className="text-xs font-black text-[var(--muted)] uppercase tracking-widest ml-4">
                                            g
                                        </span>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] ml-1">{t("calendar.details")}</h3>
                                        <input
                                            className="w-full rounded-2xl bg-slate-500/5 border border-[var(--border)] p-4 text-sm font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
                                            placeholder={t("calendar.placeholder_weight")}
                                            value={details}
                                            onChange={e => setDetails(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Common: Details/Notes */}
                            {logType !== 'feeding' && logType !== 'weight' && (
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
                            )}

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] ml-1">{t("calendar.note")} (Optional)</h3>
                                <textarea
                                    className="w-full rounded-2xl bg-slate-500/5 border border-[var(--border)] p-4 text-sm font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none resize-none min-h-[100px]"
                                    placeholder={t("calendar.placeholder_note")}
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                />
                            </div>

                            <Button
                                onClick={handleSubmitLog}
                                className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-[var(--primary)]/20 mt-4"
                            >
                                {t("common.save")}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="flex flex-col gap-8 md:flex-row pb-20 relative">
            <Card className="flex-1 p-6 relative shadow-xl border-[var(--border)]/50">
                <div className="mb-8 flex items-center justify-between px-2 gap-4 relative">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-500/5 border border-[var(--border)]/30 text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-all active:scale-90 z-10"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <h2
                            className="text-xl font-black text-[var(--foreground)] tracking-tight cursor-pointer hover:text-[var(--primary)] transition-all flex items-center gap-2 bg-slate-500/5 px-6 py-2 rounded-2xl border border-transparent hover:border-[var(--primary)]/20 pointer-events-auto group"
                            onClick={() => setIsPickerOpen(!isPickerOpen)}
                        >
                            {format(currentMonth, lang === 'ko' ? "yyyy년 M월" : "MMMM yyyy", { locale })}
                            <AnimatePresence>
                                {isPickerOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: "auto" }}
                                        exit={{ opacity: 0, width: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <ChevronRight className="h-4 w-4 rotate-90 text-[var(--primary)]" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </h2>
                    </div>

                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-500/5 border border-[var(--border)]/30 text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-all active:scale-90 z-10"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>

                <AnimatePresence>
                    {isPickerOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mb-6 border-b border-[var(--border)]/50 pb-6"
                        >
                            <div className="flex gap-3">
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-[var(--muted)] px-1">{t("calendar.year")}</label>
                                    <select
                                        className="w-full bg-slate-500/5 border border-[var(--border)] rounded-xl p-3 text-sm font-bold text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                                        value={currentMonth.getFullYear()}
                                        onChange={(e) => {
                                            const newDate = new Date(currentMonth);
                                            newDate.setFullYear(parseInt(e.target.value));
                                            setCurrentMonth(newDate);
                                        }}
                                    >
                                        {Array.from({ length: 21 }, (_, i) => 2020 + i).map(year => (
                                            <option key={year} value={year}>{year}{lang === 'ko' ? '년' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[10px] uppercase font-black tracking-widest text-[var(--muted)] px-1">{t("calendar.month")}</label>
                                    <select
                                        className="w-full bg-slate-500/5 border border-[var(--border)] rounded-xl p-3 text-sm font-bold text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                                        value={currentMonth.getMonth()}
                                        onChange={(e) => {
                                            const newDate = new Date(currentMonth);
                                            newDate.setMonth(parseInt(e.target.value));
                                            setCurrentMonth(newDate);
                                        }}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i).map(month => (
                                            <option key={month} value={month}>
                                                {lang === 'ko' ? `${month + 1}월` : format(new Date(2020, month, 1), "MMMM")}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-4 px-1">
                    {["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map(d => (
                        <div key={d}>{t(`calendar.days.${d}` as any)}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {daysInMonth.map((day, idx) => {
                        const dayEvents = getLogsForDate(day);
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                        const isEmojiMode = visualSettings?.calViewMode === 'emoji';

                        const isBirthday = currentReptile?.birthday &&
                            new Date(currentReptile.birthday).getMonth() === day.getMonth() &&
                            new Date(currentReptile.birthday).getDate() === day.getDate();

                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => { setSelectedDate(day); }}
                                className={cn(
                                    "relative flex aspect-square flex-col items-center rounded-2xl overflow-hidden",
                                    isCurrentMonth ? "text-[var(--foreground)]" : "text-[var(--muted)] opacity-30",
                                    isSelected
                                        ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30 scale-105 z-10"
                                        : "bg-slate-500/5 hover:bg-slate-500/10",
                                    isToday(day) && !isSelected && "ring-2 ring-[var(--primary)]/30",
                                    isBirthday && !isSelected && "ring-2 ring-pink-500/50 bg-pink-500/10"
                                )}
                            >
                                <span className={cn(
                                    "text-xs font-bold mt-2",
                                    isSelected && "text-white"
                                )}>{format(day, "d")}</span>

                                <div className="flex flex-wrap items-center justify-center gap-0.5 px-1 mt-1 w-full">
                                    {isEmojiMode ? (
                                        dayEvents.filter(ev => ev.type !== 'memo' && ev.type !== 'cleaning' && ev.type !== 'weight').slice(0, 4).map((ev, i) => (
                                            <span key={i} className="text-[10px] leading-none">
                                                {getLogIcon(ev)}
                                            </span>
                                        ))
                                    ) : (
                                        dayEvents.filter(ev => ev.type !== 'memo' && ev.type !== 'cleaning' && ev.type !== 'weight').slice(0, 3).map((ev, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "h-1 w-1 rounded-full",
                                                    isSelected ? "bg-white" : ""
                                                )}
                                                style={!isSelected ? { backgroundColor: `var(--color-${ev.type})` } : {}}
                                            />
                                        ))
                                    )}
                                </div>

                                {dayEvents.some(ev => ev.type === 'cleaning') && (
                                    <div
                                        className={cn(
                                            "absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 rounded-full opacity-60",
                                            isSelected ? "bg-white" : ""
                                        )}
                                        style={!isSelected ? { backgroundColor: 'var(--color-cleaning)' } : {}}
                                    />
                                )}

                                {dayEvents.some(ev => ev.type === 'memo') && (
                                    <div
                                        className={cn(
                                            "absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1 rounded-full opacity-60",
                                            isSelected ? "bg-white" : ""
                                        )}
                                        style={!isSelected ? { backgroundColor: 'var(--color-memo)' } : {}}
                                    />
                                )}

                            </button>
                        );
                    })}
                </div>
            </Card>

            <div className="w-full md:w-96 shrink-0 space-y-6">
                <AnimatePresence mode="wait">
                    {selectedDate ? (
                        <motion.div
                            key={selectedDate.toISOString()}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="space-y-6"
                        >
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-xl font-black text-[var(--foreground)] tracking-tight">
                                    {format(selectedDate, lang === 'ko' ? "M월 d일 기록" : "'Logs for' MMMM do", { locale })}
                                </h3>
                                {currentReptile?.birthday &&
                                    new Date(currentReptile.birthday).getMonth() === selectedDate.getMonth() &&
                                    new Date(currentReptile.birthday).getDate() === selectedDate.getDate() && (
                                        <div className="px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-500 text-[10px] font-black animate-bounce shadow-sm">
                                            🎂 {t("calendar.birthday_today")}
                                        </div>
                                    )}
                            </div>

                            <div className="space-y-3">
                                {currentReptile?.birthday &&
                                    new Date(currentReptile.birthday).getMonth() === selectedDate.getMonth() &&
                                    new Date(currentReptile.birthday).getDate() === selectedDate.getDate() && (
                                        <div className="relative overflow-hidden group bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-[24px] p-6 text-center">
                                            <div className="absolute top-[-20px] right-[-20px] text-6xl opacity-10 rotate-12 transition-transform group-hover:scale-110">🎂</div>
                                            <h4 className="text-lg font-black text-pink-600 tracking-tight mb-1">Happy Birthday, {currentReptile.name}!</h4>
                                            <p className="text-xs font-bold text-pink-500/70">{t("calendar.birthday_today")}</p>
                                        </div>
                                    )}

                                {(() => {
                                    if (!currentReptile?.careSchedules || !selectedDate) return null;

                                    const tasks = currentReptile.careSchedules
                                        .filter(s => s.enabled)
                                        .map(schedule => {
                                            const isDoneToday = dayLogs.some(l => l.type === schedule.type);

                                            // 1. Find the absolutely most recent log BEFORE today's midnight
                                            const todayStart = new Date(selectedDate);
                                            todayStart.setHours(0, 0, 0, 0);

                                            const lastLogBeforeToday = logs
                                                .filter(l => l.reptileId === currentReptile.id && l.type === schedule.type)
                                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                .find(l => new Date(l.date) < todayStart);

                                            let isScheduledDate = false;
                                            let isOverdue = false;

                                            if (schedule.scheduleMode === 'weekly' && schedule.specificDays?.length) {
                                                // Check if today is a scheduled day
                                                isScheduledDate = schedule.specificDays.includes(selectedDate.getDay());

                                                if (!isDoneToday && !isScheduledDate) {
                                                    // Find the most recent scheduled day before today
                                                    const targetDays = [...schedule.specificDays].sort((a, b) => b - a);
                                                    const currentDay = selectedDate.getDay();

                                                    let lastScheduledDay = targetDays.find(d => d < currentDay);
                                                    if (lastScheduledDay === undefined) lastScheduledDay = targetDays[0];

                                                    const daysToSub = (currentDay - lastScheduledDay + 7) % 7 || 7;
                                                    const lastScheduledDate = new Date(todayStart);
                                                    lastScheduledDate.setDate(todayStart.getDate() - daysToSub);

                                                    // If no logs ever OR last log was before that scheduled date
                                                    const lastLogDate = lastLogBeforeToday ? new Date(lastLogBeforeToday.date) : null;
                                                    if (!lastLogDate || (lastLogDate < lastScheduledDate && !isSameDay(lastLogDate, lastScheduledDate))) {
                                                        isOverdue = true;
                                                    }
                                                }
                                            } else if (schedule.scheduleMode === 'interval' && schedule.frequencyDays) {
                                                const lastLogDate = lastLogBeforeToday ? new Date(lastLogBeforeToday.date) : null;

                                                if (lastLogDate) {
                                                    const diff = differenceInCalendarDays(selectedDate, lastLogDate);
                                                    if (diff > 0 && diff % schedule.frequencyDays === 0) {
                                                        isScheduledDate = true;
                                                    } else if (diff > schedule.frequencyDays) {
                                                        isOverdue = true;
                                                    }
                                                } else {
                                                    isScheduledDate = true;
                                                }
                                            }

                                            // Determine visibility based on "Today" and "Delayed Date" logic
                                            const now = new Date();
                                            now.setHours(0, 0, 0, 0);
                                            const selectedStart = new Date(selectedDate);
                                            selectedStart.setHours(0, 0, 0, 0);

                                            const isPast = selectedStart < now;
                                            const isTodayDate = isSameDay(selectedDate, now);

                                            // Show as Overdue (Red) if:
                                            // 1. It is TODAY and it IS overdue (missed previous cycle)
                                            // 2. It is a PAST date that WAS scheduled (Delayed Date) and not done
                                            const showAsOverdue = (isTodayDate && isOverdue) || (isScheduledDate && isPast && !isDoneToday);

                                            // Show as Scheduled (Blue) if:
                                            // 1. It is scheduled for this date (Today or Future) and NOT done
                                            const showAsScheduled = isScheduledDate && !isPast && !isDoneToday;

                                            return { ...schedule, isOverdue: showAsOverdue, isScheduledToday: showAsScheduled, isDoneToday };
                                        })
                                        .filter(t => t.isScheduledToday || t.isOverdue);

                                    if (tasks.length === 0) return null;

                                    // Group by overdue (Red) vs scheduled (Blue)
                                    // Note: Logic above ensures they are mutually exclusive for a single day view
                                    const overdueTasks = tasks.filter(t => t.isOverdue);
                                    const scheduledTasks = tasks.filter(t => t.isScheduledToday);

                                    const renderTaskCard = (task: any) => {
                                        const Icon = task.type === 'feeding' ? Utensils : Sparkles;
                                        const baseColor = task.type === 'feeding' ? 'var(--color-feeding)' : 'var(--color-cleaning)';
                                        const isRed = task.isOverdue;

                                        return (
                                            <div
                                                key={task.type}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-[24px] border transition-all",
                                                    task.isDoneToday
                                                        ? "bg-slate-500/5 border-transparent opacity-60"
                                                        : isRed
                                                            ? "bg-red-500/5 border-red-500/20 shadow-sm animate-pulse-subtle"
                                                            : "bg-[var(--background)] border-[var(--border)] shadow-sm"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className={cn(
                                                            "h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm",
                                                            isRed ? "bg-red-500" : ""
                                                        )}
                                                        style={!isRed ? { backgroundColor: baseColor } : {}}
                                                    >
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className={cn("text-sm font-bold", isRed ? "text-red-500" : "text-[var(--foreground)]")}>
                                                                {t(`calendar.${task.type}` as any)}
                                                            </p>
                                                            {isRed && (
                                                                <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[8px] font-black uppercase">
                                                                    {t("calendar.overdue_badge")}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-[var(--muted)] font-bold">
                                                            {task.scheduleMode === 'weekly'
                                                                ? t("settings.schedule_mode_weekly")
                                                                : t("settings.every_days").replace('{{days}}', task.frequencyDays?.toString() || '')
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                {task.isDoneToday && (
                                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                                                        <Check className="h-3 w-3" />
                                                        {t("calendar.task_done")}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    };

                                    return (
                                        <div className="space-y-6 mb-8">
                                            {overdueTasks.length > 0 && (
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] font-black text-red-500/70 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                                        <span className="h-1 w-1 rounded-full bg-red-500 animate-ping" />
                                                        {t("calendar.overdue_tasks")}
                                                    </h4>
                                                    {overdueTasks.map(renderTaskCard)}
                                                </div>
                                            )}

                                            {scheduledTasks.length > 0 && (
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] px-2">
                                                        {t("calendar.scheduled_tasks")}
                                                    </h4>
                                                    {scheduledTasks.map(renderTaskCard)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {dayLogs.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center justify-center bg-slate-500/5 rounded-[32px] border border-[var(--border)] border-dashed border-2">
                                        <div className="h-16 w-16 rounded-full bg-slate-500/5 flex items-center justify-center text-3xl mb-4 grayscale opacity-30">
                                            📋
                                        </div>
                                        <p className="text-sm font-bold text-[var(--muted)]">{t("calendar.no_records")}</p>
                                    </div>
                                ) : (
                                    dayLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(renderLogItem)
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8 text-center bg-slate-500/5 rounded-[32px] border border-[var(--border)] border-dashed border-2">
                            <div className="h-20 w-20 rounded-full bg-slate-500/5 flex items-center justify-center text-4xl mb-6 opacity-30">
                                📅
                            </div>
                            <p className="text-sm font-bold text-[var(--muted)] leading-relaxed max-w-[200px]">
                                {t("calendar.select_date")}
                            </p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={openForm}
                className="fixed bottom-24 right-6 h-16 w-16 rounded-full bg-[var(--primary)] flex items-center justify-center text-white shadow-2xl z-40 transition-transform active:scale-95 group overflow-hidden"
                style={{
                    boxShadow: '0 10px 30px -5px var(--primary-shadow, rgba(0, 0, 0, 0.3))',
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
                <Plus className="h-8 w-8 transition-transform group-hover:rotate-90 relative z-10" />
            </motion.button>

            {renderModal()}
        </div>
    );
}
