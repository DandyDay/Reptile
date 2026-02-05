"use client";

import { useState, useMemo } from "react";
import { format, isSameDay, startOfDay, isAfter, startOfMonth } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { useReptileLogs, LogType } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { CalendarLogList } from "@/components/calendar/calendar-log-list";
import { CalendarLogForm } from "@/components/calendar/calendar-log-form";
import { CalendarScheduledTasks } from "@/components/calendar/calendar-scheduled-tasks";
import { Toast } from "@/components/toast";

export function CalendarView() {
    const {
        logs, reptiles, currentReptile, addLog, updateLog, deleteLog,
        visualSettings, foodPresets
    } = useReptileLogs();

    const { t } = useTranslation();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(startOfDay(new Date()));
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [initialFormDate, setInitialFormDate] = useState<Date>(startOfDay(new Date()));
    const [initialLogType, setInitialLogType] = useState<LogType | undefined>(undefined);
    const [editingLog, setEditingLog] = useState<LogType & any | null>(null);

    // Toast State
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [isToastVisible, setIsToastVisible] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setIsToastVisible(true);
    };

    const locale = visualSettings.language === 'ko' ? ko : enUS;

    const dayLogs = useMemo(() => {
        if (!selectedDate) return [];
        return logs.filter(log =>
            log.reptileId === currentReptile?.id &&
            isSameDay(new Date(log.date), selectedDate)
        );
    }, [logs, currentReptile, selectedDate]);

    const handleAddLog = (data: any) => {
        if (data.id) {
            const { id, ...fields } = data;
            updateLog(id, fields);
        } else {
            addLog(data);
        }
        setIsFormOpen(false);
        setEditingLog(null);
    };

    const handleEditLog = (log: any) => {
        setEditingLog(log);
        setIsFormOpen(true);
    };

    const handleSetCurrentMonth = (newMonth: Date) => {
        setCurrentMonth(newMonth);
        const today = new Date();
        if (newMonth.getMonth() === today.getMonth() && newMonth.getFullYear() === today.getFullYear()) {
            setSelectedDate(startOfDay(today));
        } else {
            setSelectedDate(startOfMonth(newMonth));
        }
    };

    const handleToday = () => {
        const today = new Date();
        setCurrentMonth(today);
        setSelectedDate(startOfDay(today));
        setIsPickerOpen(false);
    };

    const handleOpenForm = (date?: Date, type?: LogType) => {
        setEditingLog(null);
        const targetDate = startOfDay(date || selectedDate || new Date());
        const today = startOfDay(new Date());

        let targetType = type;
        if (isAfter(targetDate, today) && !type) {
            targetType = 'memo';
        }

        setInitialFormDate(targetDate);
        setInitialLogType(targetType);
        setIsFormOpen(true);
    };

    return (
        <div className="space-y-6">
            <CalendarScheduledTasks
                logs={logs}
                currentReptile={currentReptile}
                t={t}
                onCheckTask={(type) => {
                    const taskDate = startOfDay(selectedDate || new Date());
                    const today = startOfDay(new Date());

                    if (isAfter(taskDate, today) && type !== 'memo') {
                        showToast(t("calendar.future_log_warning"), 'error');
                        return;
                    }

                    if (type === 'cleaning' || type === 'poop') {
                        const finalDate = new Date(taskDate);
                        finalDate.setHours(0, 0, 0, 0);
                        addLog({
                            type: type,
                            date: finalDate.toISOString(),
                            details: "",
                        });
                    } else {
                        handleOpenForm(taskDate, type);
                    }
                }}
            />

            <div className="flex flex-col md:flex-row gap-6">
                <Card className="flex-1 p-6 relative shadow-xl border-[var(--border)]/50">
                    <CalendarHeader
                        currentMonth={currentMonth}
                        setCurrentMonth={handleSetCurrentMonth}
                        isPickerOpen={isPickerOpen}
                        setIsPickerOpen={setIsPickerOpen}
                        t={t}
                        lang={visualSettings.language}
                        locale={locale}
                        onToday={handleToday}
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
                    onQuickAdd={(type) => {
                        const baseDate = startOfDay(selectedDate || new Date());
                        const today = startOfDay(new Date());

                        if (isAfter(baseDate, today) && type !== 'memo') {
                            showToast(t("calendar.future_log_warning"), 'error');
                            return;
                        }

                        const finalDate = new Date(baseDate);

                        if (type === 'misting' || (['feeding', 'poop', 'cleaning'].includes(type) === false && isSameDay(baseDate, new Date()))) {
                            const now = new Date();
                            finalDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
                        } else if (['feeding', 'poop', 'cleaning'].includes(type)) {
                            finalDate.setHours(0, 0, 0, 0);
                        }

                        if (type === 'misting') {
                            addLog({
                                type: 'misting',
                                date: finalDate.toISOString(),
                                details: "",
                                note: ""
                            });
                            showToast(t("calendar.misting" as any) + " " + t("common.add" as any));
                            return;
                        }

                        addLog({
                            type,
                            date: finalDate.toISOString(),
                            details: "",
                            note: ""
                        });
                    }}
                    onEditLog={handleEditLog}
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
                onToast={showToast}
                editingLog={editingLog}
            />

            <Toast
                message={toastMessage}
                isVisible={isToastVisible}
                type={toastType}
                onClose={() => setIsToastVisible(false)}
            />
        </div>
    );
}
