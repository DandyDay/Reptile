"use client";

import { useEffect } from "react";
import { Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
    type?: 'success' | 'error';
}

export function Toast({ message, isVisible, onClose, duration = 3000, type = 'success' }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    const isError = type === 'error';

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed bottom-6 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
                    <motion.div
                        key="toast-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-full shadow-lg text-white font-semibold text-sm pointer-events-auto backdrop-blur-md",
                            isError ? "bg-red-500/80" : "bg-emerald-500/80"
                        )}
                    >
                        <div className="bg-white/20 p-1 rounded-full">
                            {isError ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </div>
                        {message}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
