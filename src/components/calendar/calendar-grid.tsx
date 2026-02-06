"use client";

import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    startOfWeek,
    endOfWeek,
    isToday
} from "date-fns";
import { cn } from "@/lib/utils";
import { Log, Reptile, VisualSettings } from "@/lib/store";
import { getLogIcon } from "./utils";

import { TranslationKey } from "@/lib/i18n";

interface CalendarGridProps {
    currentMonth: Date;
    selectedDate: Date | null;
    setSelectedDate: (date: Date) => void;
    logs: Log[];
    currentReptile: Reptile | null;
    visualSettings: VisualSettings;
    t: (key: TranslationKey) => string;
}

export function CalendarGrid({
    currentMonth,
    selectedDate,
    setSelectedDate,
    logs,
    currentReptile,
    visualSettings,
    t
}: CalendarGridProps) {
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

    return (
        <>
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
                                    dayEvents
                                        .filter((ev, index, self) =>
                                            ev.type !== 'memo' &&
                                            ev.type !== 'cleaning' &&
                                            ev.type !== 'weight' &&
                                            index === self.findIndex((t) => t.type === ev.type)
                                        )
                                        .slice(0, 4)
                                        .map((ev, i) => (
                                            <span key={i} className="text-[10px] leading-none">
                                                {getLogIcon(ev as Log)}
                                            </span>
                                        ))
                                ) : (
                                    dayEvents
                                        .filter((ev, index, self) =>
                                            ev.type !== 'memo' &&
                                            ev.type !== 'cleaning' &&
                                            ev.type !== 'weight' &&
                                            index === self.findIndex((t) => t.type === ev.type)
                                        )
                                        .slice(0, 3)
                                        .map((ev, i) => (
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
        </>
    );
}
