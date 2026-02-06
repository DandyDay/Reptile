import { useState } from "react";
import { LogType, LogEntry, useReptileLogs } from "@/lib/store";
import { startOfDay, isAfter } from "date-fns";

export function useLogForm() {
    const { addLog, updateLog } = useReptileLogs();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [initialFormDate, setInitialFormDate] = useState<Date>(startOfDay(new Date()));
    const [initialLogType, setInitialLogType] = useState<LogType | undefined>(undefined);
    const [editingLog, setEditingLog] = useState<LogEntry | null>(null);

    const openForm = (date: Date, type?: LogType) => {
        setEditingLog(null);
        const targetDate = startOfDay(date);
        const today = startOfDay(new Date());

        let targetType = type;
        // Business Logic: If future date and no explicit type, default to memo
        if (isAfter(targetDate, today) && !type) {
            targetType = 'memo';
        }

        setInitialFormDate(targetDate);
        setInitialLogType(targetType);
        setIsFormOpen(true);
    };

    const closeForm = () => setIsFormOpen(false);

    const editLog = (log: LogEntry) => {
        setEditingLog(log);
        setIsFormOpen(true);
    };

    const submitLog = (data: Omit<LogEntry, "id" | "reptileId"> & { id?: string }) => {
        if (data.id) {
            const { id, ...fields } = data;
            updateLog(id, fields);
        } else {
            addLog(data);
        }
        setIsFormOpen(false);
        setEditingLog(null);
    };

    return {
        isFormOpen,
        initialFormDate,
        initialLogType,
        editingLog,
        openForm,
        closeForm,
        editLog,
        submitLog
    };
}
