"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, isVisible, onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed bottom-6 left-0 right-0 z-[100] flex justify-center pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="flex items-center gap-2 px-4 py-3 rounded-full shadow-lg bg-[#22c55e] text-white font-bold text-sm pointer-events-auto"
                    >
                        <div className="bg-white/20 p-0.5 rounded-full">
                            <Check className="h-3 w-3" />
                        </div>
                        {message}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
