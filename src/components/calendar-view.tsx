"use client";

import { useState, useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { useReptileLogs, LogType } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { CalendarLogList } from "@/components/calendar/calendar-log-list";
import { CalendarLogForm } from "@/components/calendar/calendar-log-form";
import { CalendarScheduledTasks } from "@/components/calendar/calendar-scheduled-tasks";

export function CalendarView() {
    const {
        logs, reptiles, currentReptile, addLog, deleteLog,
        visualSettings, foodPresets
    } = useReptileLogs();

    const { t } = useTranslation();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [initialFormDate, setInitialFormDate] = useState<Date>(new Date());
    const [initialLogType, setInitialLogType] = useState<LogType | undefined>(undefined);

    const locale = visualSettings.language === 'ko' ? ko : enUS;

    const dayLogs = useMemo(() => {
        if (!selectedDate) return [];
        return logs.filter(log =>
            log.reptileId === currentReptile?.id &&
            isSameDay(new Date(log.date), selectedDate)
        );
    }, [logs, currentReptile, selectedDate]);

    const handleAddLog = (data: any) => {
        addLog(data);
        setIsFormOpen(false);
    };

    const handleOpenForm = (date?: Date, type?: LogType) => {
        setInitialFormDate(date || selectedDate || new Date());
        setInitialLogType(type);
        setIsFormOpen(true);
    };

    return (
        <div className="space-y-6">
            <CalendarScheduledTasks
                logs={logs}
                currentReptile={currentReptile}
                t={t}
                onCheckTask={(type) => handleOpenForm(new Date(), type)}
            />

            <div className="flex flex-col md:flex-row gap-6">
                <Card className="flex-1 p-6 relative shadow-xl border-[var(--border)]/50">
                    <CalendarHeader
                        currentMonth={currentMonth}
                        setCurrentMonth={setCurrentMonth}
                        isPickerOpen={isPickerOpen}
                        setIsPickerOpen={setIsPickerOpen}
                        t={t}
                        lang={visualSettings.language}
                        locale={locale}
                    />

                    <CalendarGrid
                        currentMonth={currentMonth}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        logs={logs}
                        currentReptile={currentReptile}
                        visualSettings={visualSettings}
                        t={t}
                    />
                </Card>

                <CalendarLogList
                    selectedDate={selectedDate}
                    dayLogs={dayLogs}
                    onDeleteLog={deleteLog}
                    currentReptile={currentReptile}
                    t={t}
                    lang={visualSettings.language}
                    locale={locale}
                    onAddLog={() => handleOpenForm()}
                    allLogs={logs}
                />
            </div>

            <CalendarLogForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleAddLog}
                reptiles={reptiles}
                currentReptile={currentReptile}
                foodPresets={foodPresets}
                t={t}
                initialDate={initialFormDate}
                initialLogType={initialLogType}
            />
        </div>
    );
}
