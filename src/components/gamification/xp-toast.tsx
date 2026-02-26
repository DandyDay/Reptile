"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface XPNotification {
  id: number;
  xp: number;
}

export function XPToast() {
  const [notifications, setNotifications] = useState<XPNotification[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { xp } = (e as CustomEvent).detail;
      const id = Date.now();
      setNotifications((prev) => [...prev, { id, xp }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 2500);
    };
    window.addEventListener("xp-gain", handler);
    return () => window.removeEventListener("xp-gain", handler);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 40, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.8 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg"
            style={{
              background: "var(--primary)",
              color: "var(--background)",
              fontWeight: 700,
              fontSize: "0.95rem",
            }}
          >
            <span>⭐</span>
            <span>+{n.xp} XP</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
