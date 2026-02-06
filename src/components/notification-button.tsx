"use client";

import React, { useState, useRef, useEffect } from "react";
import { useReptileLogs } from "@/lib/store";
import { Bell, X, Check, Trash2, MessageSquare, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export function NotificationButton() {
    const { notifications, markNotificationAsRead, deleteNotification, visualSettings } = useReptileLogs();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const locale = visualSettings.language === 'ko' ? ko : enUS;

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleNotificationClick = async (notif: any) => {
        if (!notif.isRead) {
            await markNotificationAsRead(notif.id);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-[var(--secondary)] transition-colors text-[var(--muted)] hover:text-[var(--primary)]"
                aria-label="Notifications"
            >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[var(--background)] animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--card)] rounded-2xl shadow-xl border border-[var(--border)] z-50 overflow-hidden"
                    >
                        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--background)]/50 backdrop-blur-sm">
                            <h3 className="font-bold text-lg">{t("common.notifications")}</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => notifications.forEach(n => !n.isRead && markNotificationAsRead(n.id))}
                                    className="text-xs font-bold text-[var(--primary)] hover:underline"
                                    disabled={unreadCount === 0}
                                >
                                    {t("common.mark_all_read")}
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border)] p-2 space-y-2">
                            {notifications.length === 0 ? (
                                <div className="py-10 text-center text-[var(--muted)]">
                                    <Bell className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">알림이 없습니다.</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={cn(
                                            "relative group flex gap-3 p-3 rounded-xl transition-all border",
                                            notif.isRead
                                                ? "bg-transparent border-transparent hover:bg-[var(--secondary)]/30"
                                                : "bg-[var(--secondary)]/10 border-[var(--primary)]/10 hover:bg-[var(--secondary)]/50"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-10 w-10 shrink-0 rounded-full flex items-center justify-center",
                                            notif.type === 'comment' ? "bg-blue-500/10 text-blue-500" : "bg-[var(--primary)]/10 text-[var(--primary)]"
                                        )}>
                                            {notif.type === 'comment' ? <MessageSquare className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                        </div>

                                        <Link
                                            href={notif.link || '#'}
                                            onClick={() => handleNotificationClick(notif)}
                                            className="flex-1 min-w-0"
                                        >
                                            <p className={cn("text-sm leading-snug", !notif.isRead && "font-semibold")}>
                                                {notif.content}
                                            </p>
                                            <p className="text-[10px] text-[var(--muted)] mt-1">
                                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale })}
                                            </p>
                                        </Link>

                                        <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notif.isRead && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); markNotificationAsRead(notif.id); }}
                                                    className="p-1 text-[var(--primary)] hover:bg-[var(--background)] rounded-full"
                                                    title={t("common.mark_as_read")}
                                                >
                                                    <Check className="h-3 w-3" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                                className="p-1 text-[var(--muted)] hover:text-red-500 hover:bg-[var(--background)] rounded-full"
                                                title={t("common.delete")}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
