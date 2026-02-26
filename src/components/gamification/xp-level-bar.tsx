"use client";

import { motion } from "framer-motion";
import { useGamification } from "@/lib/gamification-store";
import { getXpProgress, getLevelName, UNLOCK_3D_LEVEL } from "@/lib/gamification";
import { useTranslation } from "@/lib/i18n";

export function XPLevelBar() {
  const { totalXp, isLoaded } = useGamification();
  const { t, lang } = useTranslation();
  const { level, current, required, isMaxLevel } = getXpProgress(totalXp);
  const levelName = getLevelName(level, lang);
  const progressPct = isMaxLevel ? 100 : Math.min((current / required) * 100, 100);
  const unlocks3D = level >= UNLOCK_3D_LEVEL;

  if (!isLoaded) return null;

  return (
    <div
      className="rounded-2xl p-4 mb-4"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold"
            style={{ background: "var(--primary)", color: "var(--background)" }}
          >
            {level}
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: "var(--text)" }}>
              {t("gamification.level")} {level} · {levelName}
            </div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              {isMaxLevel
                ? t("gamification.max_level")
                : `${current} / ${required} ${t("gamification.xp")}`}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
            {totalXp} XP
          </div>
          {!unlocks3D && (
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              🗿 {1000 - totalXp} XP → 3D
            </div>
          )}
          {unlocks3D && (
            <div className="text-xs" style={{ color: "var(--primary)" }}>
              ✨ {t("gamification.unlock_3d")}
            </div>
          )}
        </div>
      </div>

      {/* XP progress bar */}
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "var(--border)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--primary)" }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {!unlocks3D && (
        <div className="mt-2 flex items-center gap-1">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs px-2" style={{ color: "var(--muted)" }}>
            🦎 {t("gamification.creature_placeholder")}
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>
      )}
    </div>
  );
}
