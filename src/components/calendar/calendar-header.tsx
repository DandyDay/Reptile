"use client";

import { ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import { TranslationKey } from "@/lib/i18n";

interface CalendarHeaderProps {
    currentMonth: Date;
    setCurrentMonth: (date: Date) => void;
    isPickerOpen: boolean;
    setIsPickerOpen: (open: boolean) => void;
    t: (key: TranslationKey) => string;
    lang: 'ko' | 'en';
    locale: any;
    onToday: () => void;
}

export function CalendarHeader({
    currentMonth,
    setCurrentMonth,
    isPickerOpen,
    setIsPickerOpen,
    t,
    lang,
    locale,
    onToday
}: CalendarHeaderProps) {
    return (
        <>
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
                                    <ChevronRightIcon className="h-4 w-4 rotate-90 text-[var(--primary)]" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </h2>
                </div>

                <div className="flex items-center gap-2 z-10">
                    <button
                        onClick={onToday}
                        className="h-10 px-4 flex items-center justify-center rounded-2xl bg-slate-500/5 border border-[var(--border)]/30 text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-all active:scale-90 text-[10px] font-black uppercase tracking-wider"
                    >
                        {lang === 'ko' ? '오늘' : 'Today'}
                    </button>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-500/5 border border-[var(--border)]/30 text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-all active:scale-90"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
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
        </>
    );
}
