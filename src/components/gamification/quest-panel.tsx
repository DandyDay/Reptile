"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGamification, QuestProgressEntry } from "@/lib/gamification-store";
import {
  DAILY_QUESTS,
  WEEKLY_QUESTS,
  ACHIEVEMENTS,
  CHALLENGES,
  QuestDef,
} from "@/lib/gamification";
import { useTranslation } from "@/lib/i18n";

type Tab = "daily" | "weekly" | "achievements" | "challenges";

function QuestRow({
  quest,
  progress,
  lang,
}: {
  quest: QuestDef;
  progress: QuestProgressEntry | undefined;
  lang: "ko" | "en";
}) {
  const p = progress?.progress ?? 0;
  const completed = progress?.completed ?? false;
  const rewarded = progress?.rewarded ?? false;
  const completions = progress?.completions ?? 0;
  const pct = Math.min((p / quest.target) * 100, 100);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{
        background: rewarded
          ? "color-mix(in srgb, var(--primary), transparent 88%)"
          : "var(--background)",
        border: "1px solid var(--border)",
        opacity: rewarded ? 0.8 : 1,
      }}
    >
      <div className="text-2xl flex-shrink-0">{quest.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-sm font-semibold truncate"
            style={{ color: "var(--text)" }}
          >
            {lang === "ko" ? quest.labelKo : quest.labelEn}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {rewarded ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--primary)", color: "var(--background)" }}>
                ✓
              </span>
            ) : (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: "color-mix(in srgb, var(--primary), transparent 80%)",
                  color: "var(--primary)",
                }}
              >
                +{quest.xp} XP
              </span>
            )}
          </div>
        </div>
        {quest.type === "challenge" && (
          <div className="flex items-center gap-1.5 mt-0.5 mb-1 flex-wrap">
            <span
              className="inline-block text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "color-mix(in srgb, var(--accent), transparent 80%)",
                color: "var(--accent)",
                fontSize: "0.65rem",
              }}
            >
              {lang === "ko" ? "🗓 주기 기반" : "🗓 Schedule-based"}
            </span>
            {completions > 0 && (
              <span
                className="inline-block text-xs px-1.5 py-0.5 rounded font-semibold"
                style={{
                  background: "color-mix(in srgb, var(--primary), transparent 80%)",
                  color: "var(--primary)",
                  fontSize: "0.65rem",
                }}
              >
                {lang === "ko" ? `${completions}번 완료` : `Completed ${completions}×`}
              </span>
            )}
          </div>
        )}
        <div className="text-xs mt-0.5 mb-1.5" style={{ color: "var(--muted)" }}>
          {lang === "ko" ? quest.descKo : quest.descEn}
        </div>
        {quest.target > 1 && (
          <div className="flex items-center gap-2">
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--border)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: completed ? "var(--primary)" : "var(--primary)" }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {p}/{quest.target}
            </span>
          </div>
        )}
        {quest.target === 1 && !rewarded && (
          <div
            className="h-1.5 rounded-full"
            style={{ background: "var(--border)" }}
          />
        )}
      </div>
    </div>
  );
}

export function QuestPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("daily");
  const { questProgress, unlockedAchievements, isLoaded } = useGamification();
  const { t, lang } = useTranslation();

  const tabs: { id: Tab; label: string }[] = [
    { id: "daily", label: t("gamification.daily_quests") },
    { id: "weekly", label: t("gamification.weekly_quests") },
    { id: "achievements", label: t("gamification.achievements") },
    { id: "challenges", label: t("gamification.challenges") },
  ];

  const getQuestsForTab = () => {
    switch (activeTab) {
      case "daily": return DAILY_QUESTS;
      case "weekly": return WEEKLY_QUESTS;
      case "achievements": return ACHIEVEMENTS;
      case "challenges": return CHALLENGES;
    }
  };

  const getProgressForQuest = (quest: QuestDef): QuestProgressEntry | undefined => {
    if (quest.type === "achievement") {
      return {
        progress: questProgress[quest.key]?.progress ?? 0,
        completed: unlockedAchievements.has(quest.key),
        rewarded: unlockedAchievements.has(quest.key),
      };
    }
    // Challenges and daily/weekly use questProgress directly
    return questProgress[quest.key];
  };

  if (!isLoaded) return null;

  const quests = getQuestsForTab();

  return (
    <div
      className="rounded-2xl overflow-hidden mb-4"
      style={{ border: "1px solid var(--border)" }}
    >
      {/* Tabs */}
      <div
        className="flex overflow-x-auto"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-shrink-0 px-4 py-3 text-xs font-semibold transition-colors relative"
            style={{
              color: activeTab === tab.id ? "var(--primary)" : "var(--muted)",
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="quest-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: "var(--primary)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Quest list */}
      <div className="p-3 flex flex-col gap-2" style={{ background: "var(--card)" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2"
          >
            {quests.map((quest) => (
              <QuestRow
                key={quest.key}
                quest={quest}
                progress={getProgressForQuest(quest)}
                lang={lang}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
