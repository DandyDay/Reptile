"use client";

import { differenceInCalendarDays, isSameDay } from "date-fns";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Log, Reptile, LogType } from "@/lib/store";

import { TranslationKey } from "@/lib/i18n";

interface CalendarScheduledTasksProps {
    logs: Log[];
    currentReptile: Reptile | null;
    t: (key: TranslationKey) => string;
    onCheckTask: (type: LogType) => void;
}

export function CalendarScheduledTasks({
    logs,
    currentReptile,
    t,
    onCheckTask
}: CalendarScheduledTasksProps) {
    if (!currentReptile?.careSchedules) return null;

    const scheduledItems: { type: LogType, date: Date, status: 'today' | 'overdue' | 'upcoming', daysLeft?: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    currentReptile.careSchedules.forEach(schedule => {
        if (!schedule.enabled) return;

        const lastLog = logs
            .filter(l => l.reptileId === currentReptile.id && l.type === schedule.type)
            .filter(l => new Date(l.date) <= today)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        let nextDate = new Date();
        nextDate.setHours(0, 0, 0, 0);

        if (schedule.scheduleMode === 'interval' && schedule.frequencyDays) {
            if (lastLog) {
                const lastDate = new Date(lastLog.date);
                lastDate.setHours(0, 0, 0, 0);
                nextDate = new Date(lastDate);
                nextDate.setDate(lastDate.getDate() + schedule.frequencyDays);
            }
            // If no last log, next date is today (default)
        } else if (schedule.scheduleMode === 'weekly' && schedule.specificDays) {
            const currentDay = today.getDay();
            const targetDays = [...schedule.specificDays].sort((a, b) => a - b);

            // Check if today is a scheduled day and not yet logged
            const isTodayScheduled = targetDays.includes(currentDay);
            const hasLoggedToday = lastLog && isSameDay(new Date(lastLog.date), today);

            if (isTodayScheduled && !hasLoggedToday) {
                // Due Today
                nextDate = new Date(today);
            } else {
                // Find most recent scheduled day in the past (before today)
                const pastDays = targetDays.filter(d => d < currentDay);
                const lastScheduledDayOfWeek = pastDays.length > 0
                    ? pastDays[pastDays.length - 1]
                    : targetDays[targetDays.length - 1];

                let daysToSubtract = currentDay - lastScheduledDayOfWeek;
                if (daysToSubtract <= 0) daysToSubtract += 7;

                const prevScheduledDate = new Date(today);
                prevScheduledDate.setDate(today.getDate() - daysToSubtract);

                // Compare lastLog with prevScheduledDate
                const lastLogDate = lastLog ? new Date(lastLog.date) : new Date(0);
                lastLogDate.setHours(0, 0, 0, 0);

                if (lastLogDate < prevScheduledDate) {
                    // Overdue!
                    nextDate = prevScheduledDate;
                } else {
                    // Not overdue, find the next future scheduled day
                    const futureDays = targetDays.filter(d => d > currentDay);
                    const nextScheduledDayOfWeek = futureDays.length > 0
                        ? futureDays[0]
                        : targetDays[0];

                    let daysToAdd = nextScheduledDayOfWeek - currentDay;
                    if (daysToAdd <= 0) daysToAdd += 7;

                    nextDate = new Date(today);
                    nextDate.setDate(today.getDate() + daysToAdd);
                }
            }
        }

        const diff = differenceInCalendarDays(nextDate, today);
        let status: 'today' | 'overdue' | 'upcoming' = 'upcoming';

        if (diff < 0) status = 'overdue';
        else if (diff === 0) status = 'today';
        else status = 'upcoming';

        // Only show if overdue or today, or very soon (tomorrow)
        if (status === 'overdue' || status === 'today') {
            scheduledItems.push({
                type: schedule.type,
                date: nextDate,
                status,
                daysLeft: diff
            });
        }
    });

    if (scheduledItems.length === 0) return null;

    return (
        <div className="bg-slate-500/5 rounded-2xl p-4 border border-[var(--border)] mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
                {t("calendar.scheduled_tasks")}
            </h3>
            <div className="space-y-2">
                {scheduledItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[var(--background)] rounded-xl border border-[var(--border)] shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center text-lg",
                                item.type === 'feeding' ? "bg-orange-500/10 text-orange-500" :
                                    item.type === 'cleaning' ? "bg-green-500/10 text-green-500" :
                                        item.type === 'poop' ? "bg-purple-500/10 text-purple-500" :
                                            "bg-blue-500/10 text-blue-500"
                            )}>
                                {item.type === 'feeding' ? '🦗' :
                                    item.type === 'cleaning' ? '🧹' :
                                        item.type === 'poop' ? '💩' : '📝'}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[var(--foreground)]">{t(`calendar.${item.type}` as any)}</p>
                                <p className={cn("text-[10px] font-bold uppercase tracking-wide",
                                    item.status === 'overdue' ? "text-red-500" : "text-[var(--primary)]"
                                )}>
                                    {item.status === 'overdue'
                                        ? t("calendar.overdue_by").replace('{{days}}', Math.abs(item.daysLeft || 0).toString())
                                        : t("calendar.due_today")
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => onCheckTask(item.type)}
                            className="h-8 w-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white flex items-center justify-center transition-all active:scale-95"
                        >
                            <Check className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
