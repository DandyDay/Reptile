"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "primary";
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText,
    cancelText,
    variant = "primary"
}: ConfirmDialogProps) {
    const { t } = useTranslation();

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="relative w-full max-w-xs overflow-hidden border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={cn(
                        "mb-4 flex h-12 w-12 items-center justify-center rounded-full",
                        variant === "danger" ? "bg-red-500/10 text-red-500" : "bg-[var(--primary)]/10 text-[var(--primary)]"
                    )}>
                        <AlertTriangle className="h-6 w-6" />
                    </div>

                    <h3 className="mb-2 text-lg font-bold text-[var(--foreground)]">
                        {title}
                    </h3>
                    {description && (
                        <p className="mb-6 text-sm text-[var(--muted)] whitespace-pre-wrap">
                            {description}
                        </p>
                    )}

                    <div className="flex w-full gap-3">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1 font-bold border-[var(--border)]"
                        >
                            {cancelText || t("common.cancel") || "Cancel"}
                        </Button>
                        <Button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={cn(
                                "flex-1 font-bold text-white",
                                variant === "danger" ? "bg-red-500 hover:bg-red-600" : "bg-[var(--primary)] hover:opacity-90"
                            )}
                        >
                            {confirmText || t("common.confirm") || "Confirm"}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
