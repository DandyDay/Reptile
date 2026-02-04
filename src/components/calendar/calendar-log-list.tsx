"use client";

import { format, differenceInCalendarDays, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Log, Reptile, LogType } from "@/lib/store";
import { getLogIcon } from "./utils";

import { QuickLogButtons } from "./quick-log-buttons";
import { TranslationKey } from "@/lib/i18n";

interface CalendarLogListProps {
    selectedDate: Date | null;
    dayLogs: Log[];
    onDeleteLog: (id: string) => void;
    currentReptile: Reptile | null;
    t: (key: TranslationKey) => string;
    lang: 'ko' | 'en';
    locale: any;
    onAddLog: () => void;
    onQuickAdd: (type: LogType) => void;
    allLogs: Log[]; // Needed for calculating overdue/scheduled status which looks back in history
}

export function CalendarLogList({
    selectedDate,
    dayLogs,
    onDeleteLog,
    currentReptile,
    t,
    lang,
    locale,
    onAddLog,
    onQuickAdd,
    allLogs
}: CalendarLogListProps) {
    const renderLogItem = (log: Log) => (
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

                                    // Complex logic for scheduling... reusing from original
                                    const lastLogBeforeThis = allLogs
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
                                        )}
                                        >
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
                    onClick={() => onDeleteLog(log.id)}
                    className="opacity-0 group-hover:opacity-100 transition-all p-2 text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
            {
                log.note && (
                    <div className="ml-16 bg-white/5 p-3 rounded-xl text-[11px] text-[var(--muted)] italic border border-[var(--border)]/50 leading-relaxed shadow-inner">
                        "{log.note}"
                    </div>
                )
            }
        </div>
    );

    return (
        <div className="w-full md:w-96 shrink-0 space-y-6 relative h-full">
            <QuickLogButtons onQuickAdd={onQuickAdd} currentReptile={currentReptile} />
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

                        <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                            {dayLogs.length > 0 ? (
                                dayLogs.map(renderLogItem)
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)] opacity-50 space-y-4">
                                    <div className="h-16 w-16 rounded-3xl bg-slate-500/10 flex items-center justify-center">
                                        <Check className="h-8 w-8" />
                                    </div>
                                    <p className="text-sm font-bold">{t("calendar.no_logs")}</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onAddLog}
                            className="fixed bottom-6 right-6 md:absolute md:bottom-0 md:right-0 h-14 w-14 rounded-full bg-[var(--primary)] text-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20"
                            aria-label={t("calendar.add_log")}
                        >
                            <Plus className="h-6 w-6" />
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-64 text-[var(--muted)] opacity-50"
                    >
                        <p className="font-medium">{t("calendar.select_date")}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
