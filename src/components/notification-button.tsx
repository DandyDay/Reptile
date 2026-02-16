"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useReptileLogs } from "@/lib/store";
import { Bell, X, Check, Trash2, MessageSquare, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

function NotificationPanel({
    notifications,
    markNotificationAsRead,
    deleteNotification,
    unreadCount,
    locale,
    onClose,
    onNotificationClick,
    t,
    buttonRef,
}: {
    notifications: any[];
    markNotificationAsRead: (id: string) => void;
    deleteNotification: (id: string) => void;
    unreadCount: number;
    locale: any;
    onClose: () => void;
    onNotificationClick: (notif: any) => void;
    t: (key: string) => string;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
    const [isMobile, setIsMobile] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Position dropdown relative to button on desktop
    useEffect(() => {
        if (!isMobile && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownStyle({
                position: "fixed",
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            });
        }
    }, [isMobile, buttonRef]);

    // Close on click outside (desktop)
    useEffect(() => {
        if (isMobile) return;
        const handleClick = (e: MouseEvent) => {
            if (buttonRef.current?.contains(e.target as Node)) return;
            onClose();
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isMobile, onClose, buttonRef]);

    // Prevent body scroll on mobile
    useEffect(() => {
        if (isMobile) {
            document.body.style.overflow = "hidden";
            return () => { document.body.style.overflow = ""; };
        }
    }, [isMobile]);

    return (
        <>
            {/* Backdrop (mobile only) */}
            {isMobile && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-[9998]"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <motion.div
                initial={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, y: 10, scale: 0.95 }}
                animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 }}
                exit={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={cn(
                    "z-[9999] flex flex-col bg-[var(--background)] border border-[var(--border)] shadow-2xl",
                    isMobile
                        ? "fixed inset-2 rounded-3xl"
                        : "fixed w-96 rounded-2xl max-h-[480px]"
                )}
                style={isMobile ? undefined : dropdownStyle}
            >
                {/* Header */}
                <div className="p-4 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-lg">{t("common.notifications")}</h3>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => notifications.forEach(n => !n.isRead && markNotificationAsRead(n.id))}
                            className="text-xs font-bold text-[var(--primary)] hover:underline"
                            disabled={unreadCount === 0}
                        >
                            {t("common.mark_all_read")}
                        </button>
                        {isMobile && (
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-[var(--secondary)] text-[var(--muted)]"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-[var(--background)]">
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
                                        ? "bg-[var(--background)] border-transparent hover:bg-[var(--secondary)]"
                                        : "bg-[var(--secondary)] border-[var(--primary)]/20 hover:bg-[var(--secondary)]"
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
                                    onClick={() => onNotificationClick(notif)}
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
        </>
    );
}

export function NotificationButton() {
    const { notifications, markNotificationAsRead, deleteNotification, visualSettings } = useReptileLogs();
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { t } = useTranslation();

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const locale = visualSettings.language === 'ko' ? ko : enUS;

    const handleNotificationClick = async (notif: any) => {
        if (!notif.isRead) {
            await markNotificationAsRead(notif.id);
        }
        setIsOpen(false);
    };

    return (
        <>
            <button
                ref={buttonRef}
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

            {typeof window !== "undefined" && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <NotificationPanel
                            notifications={notifications}
                            markNotificationAsRead={markNotificationAsRead}
                            deleteNotification={deleteNotification}
                            unreadCount={unreadCount}
                            locale={locale}
                            onClose={() => setIsOpen(false)}
                            onNotificationClick={handleNotificationClick}
                            t={t}
                            buttonRef={buttonRef}
                        />
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
