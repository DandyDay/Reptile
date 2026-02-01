"use client";

import React from "react";
import { X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden"
                >
                    <div className="p-6 text-center space-y-4">
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-[var(--primary)]/10 text-[var(--primary)]'}`}>
                            <AlertTriangle className="h-6 w-6" />
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-[var(--foreground)]">{title}</h3>
                            <p className="text-sm text-[var(--muted)]">{description}</p>
                        </div>
                    </div>

                    <div className="flex border-t border-[var(--border)]">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 text-sm font-medium text-[var(--muted)] hover:bg-[var(--secondary)] transition-colors"
                        >
                            {cancelText}
                        </button>
                        <div className="w-[1px] bg-[var(--border)]" />
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 px-4 py-3 text-sm font-bold hover:bg-[var(--secondary)] transition-colors ${isDestructive ? 'text-red-500' : 'text-[var(--primary)]'}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
