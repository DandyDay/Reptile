"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, AlertCircle, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    type?: "success" | "error" | "info";
}

export function AlertDialog({ isOpen, onClose, title, description, type = "info" }: AlertDialogProps) {
    const { t } = useTranslation();

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleEscape);
        }
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="relative w-full max-w-xs overflow-hidden border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={cn(
                        "mb-4 flex h-12 w-12 items-center justify-center rounded-full",
                        type === "success" && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                        type === "error" && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                        type === "info" && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    )}>
                        {type === "success" && <Check className="h-6 w-6" />}
                        {type === "error" && <AlertCircle className="h-6 w-6" />}
                        {type === "info" && <AlertCircle className="h-6 w-6" />}
                    </div>

                    <h3 className="mb-2 text-lg font-bold text-[var(--foreground)]">
                        {title}
                    </h3>
                    {description && (
                        <p className="mb-6 text-sm text-[var(--muted)]">
                            {description}
                        </p>
                    )}

                    <Button
                        onClick={onClose}
                        className={cn(
                            "w-full font-bold",
                            type === "success" && "bg-green-500 hover:bg-green-600 text-white",
                            type === "error" && "bg-red-500 hover:bg-red-600 text-white",
                            type === "info" && "bg-[var(--primary)] text-white"
                        )}
                    >
                        {t("common.confirm") || "OK"}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
