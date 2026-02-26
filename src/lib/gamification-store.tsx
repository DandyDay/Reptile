"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";
import { useReptileLogs, LogEntry, Reptile } from "./store";
import {
  DAILY_QUESTS,
  WEEKLY_QUESTS,
  ACHIEVEMENTS,
  CHALLENGES,
  getDailyPeriodKey,
  getWeeklyPeriodKey,
  getOnScheduleStreak,
  getLevel,
} from "./gamification";

export interface QuestProgressEntry {
  progress: number;
  completed: boolean;
  rewarded: boolean;
}

export type QuestProgressMap = Record<string, QuestProgressEntry>;

export interface Model3DStatus {
  status: "pending" | "processing" | "succeeded" | "failed";
  glbUrl: string | null;
  thumbnailUrl: string | null;
  taskId: string | null;
}

interface GamificationContextType {
  totalXp: number;
  level: number;
  questProgress: QuestProgressMap;
  unlockedAchievements: Set<string>;
  model3DStatus: Model3DStatus | null;
  isLoaded: boolean;
  generate3DModel: (reptileId: string, imageUrl: string) => Promise<void>;
  fetchModel3DStatus: (reptileId: string) => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType>({
  totalXp: 0,
  level: 1,
  questProgress: {},
  unlockedAchievements: new Set(),
  model3DStatus: null,
  isLoaded: false,
  generate3DModel: async () => {},
  fetchModel3DStatus: async () => {},
});

export function useGamification() {
  return useContext(GamificationContext);
}

// Returns local date string 'YYYY-MM-DD' (avoids UTC offset issues)
function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Monday of the current local week as 'YYYY-MM-DD'
function getMondayStr(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  now.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return localDateStr(now);
}

// Extract local date from log date string
function logLocalDate(dateStr: string): string {
  return localDateStr(new Date(dateStr));
}

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { session, allLogs, currentReptile } = useReptileLogs();
  const currentReptileRef = useRef<Reptile | null>(null);
  useEffect(() => { currentReptileRef.current = currentReptile ?? null; }, [currentReptile]);
  const [totalXp, setTotalXp] = useState(0);
  const [questProgress, setQuestProgress] = useState<QuestProgressMap>({});
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [model3DStatus, setModel3DStatus] = useState<Model3DStatus | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Refs for latest state without causing useCallback re-creation
  const questProgressRef = useRef<QuestProgressMap>({});
  const unlockedAchievementsRef = useRef<Set<string>>(new Set());
  const evaluatingRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLL_ATTEMPTS = 120; // 10 minutes at 5s intervals

  // Keep refs in sync with state
  useEffect(() => { questProgressRef.current = questProgress; }, [questProgress]);
  useEffect(() => { unlockedAchievementsRef.current = unlockedAchievements; }, [unlockedAchievements]);

  const level = getLevel(totalXp);

  // Load initial state from Supabase — pass userId to avoid stale closure
  const loadGamificationData = useCallback(async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("total_xp")
      .eq("id", userId)
      .single();
    if (profileData) setTotalXp(profileData.total_xp ?? 0);

    const dailyKey = getDailyPeriodKey();
    const weeklyKey = getWeeklyPeriodKey();
    const { data: progressData } = await supabase
      .from("quest_progress")
      .select("*")
      .eq("user_id", userId)
      .in("period_key", [dailyKey, weeklyKey]);

    if (progressData) {
      const map: QuestProgressMap = {};
      for (const row of progressData) {
        map[row.quest_key] = {
          progress: row.progress,
          completed: row.completed,
          rewarded: row.rewarded_at != null,
        };
      }
      setQuestProgress(map);
    }

    const { data: achData } = await supabase
      .from("achievements")
      .select("achievement_key")
      .eq("user_id", userId);
    if (achData) {
      setUnlockedAchievements(new Set(achData.map((a) => a.achievement_key)));
    }

    // Auto-grant daily_open_app attendance quest (opening the app = check-in)
    const todayKey = getDailyPeriodKey();
    const alreadyCheckedIn = progressData?.some(
      (p) => p.quest_key === "daily_open_app" && p.period_key === todayKey && p.rewarded_at != null
    );
    if (!alreadyCheckedIn) {
      const openAppXp = 2;
      // Grant XP directly (avoid circular dep with grantXp callback)
      const { data: newXp } = await supabase.rpc("grant_xp", {
        p_user_id: userId,
        p_source: "quest",
        p_source_key: "daily_open_app",
        p_xp_delta: openAppXp,
      });
      if (typeof newXp === "number") setTotalXp(newXp);
      await supabase.from("quest_progress").upsert(
        {
          user_id: userId,
          quest_key: "daily_open_app",
          period_key: todayKey,
          progress: 1,
          completed: true,
          rewarded_at: new Date().toISOString(),
        },
        { onConflict: "user_id,quest_key,period_key" }
      );
      // Dispatch XP toast after a small delay (so UI is ready)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("xp-gain", { detail: { xp: openAppXp } }));
      }, 1500);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setIsLoaded(true);
      return;
    }
    loadGamificationData(session.user.id);
  }, [session?.user?.id, loadGamificationData]);

  const grantXp = useCallback(
    async (source: string, sourceKey: string, xpDelta: number) => {
      if (!session?.user) return;
      try {
        const { data: newXp } = await supabase.rpc("grant_xp", {
          p_user_id: session.user.id,
          p_source: source,
          p_source_key: sourceKey,
          p_xp_delta: xpDelta,
        });
        if (typeof newXp === "number") setTotalXp(newXp);
        window.dispatchEvent(new CustomEvent("xp-gain", { detail: { xp: xpDelta } }));
      } catch (e) {
        console.error("grant_xp failed", e);
      }
    },
    [session?.user?.id]
  );

  const upsertQuestProgress = useCallback(
    async (questKey: string, periodKey: string, progress: number, completed: boolean, rewarded: boolean) => {
      if (!session?.user) return;
      await supabase.from("quest_progress").upsert(
        {
          user_id: session.user.id,
          quest_key: questKey,
          period_key: periodKey,
          progress,
          completed,
          rewarded_at: rewarded ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,quest_key,period_key" }
      );
    },
    [session?.user?.id]
  );

  // evaluateQuests reads from refs (not state) to avoid stale closure and dep array bloat
  const evaluateQuests = useCallback(
    async (logs: LogEntry[]) => {
      if (!session?.user || evaluatingRef.current) return;
      evaluatingRef.current = true;

      try {
        const currentQuestProgress = questProgressRef.current;
        const currentUnlocked = unlockedAchievementsRef.current;

        const today = localDateStr();
        const dailyKey = getDailyPeriodKey();
        const weeklyKey = getWeeklyPeriodKey();
        const mondayStr = getMondayStr();

        const newProgress: QuestProgressMap = { ...currentQuestProgress };

        // Count logs for a period (uses local dates)
        const countLogs = (periodStart: string, periodEnd: string, logTypes?: string[]) =>
          logs.filter((l) => {
            const d = logLocalDate(l.date);
            return d >= periodStart && d <= periodEnd && (!logTypes || logTypes.includes(l.type));
          }).length;

        // Count unique feeding days this week
        const weeklyFeedingDayCount = new Set(
          logs
            .filter((l) => l.type === "feeding" && logLocalDate(l.date) >= mondayStr)
            .map((l) => logLocalDate(l.date))
        ).size;

        // Daily quests
        for (const quest of DAILY_QUESTS) {
          const existing = newProgress[quest.key];
          if (existing?.rewarded) continue;

          const count = countLogs(today, today, quest.key === "daily_any" ? undefined : quest.logTypes);
          const completed = count >= quest.target;
          newProgress[quest.key] = { progress: count, completed, rewarded: existing?.rewarded ?? false };

          if (completed && !existing?.rewarded) {
            await grantXp("quest", quest.key, quest.xp);
            newProgress[quest.key].rewarded = true;
            await upsertQuestProgress(quest.key, dailyKey, count, true, true);
          }
        }

        // Weekly quests
        for (const quest of WEEKLY_QUESTS) {
          const existing = newProgress[quest.key];
          if (existing?.rewarded) continue;

          const count = quest.key === "weekly_feed_7"
            ? weeklyFeedingDayCount
            : countLogs(mondayStr, today, quest.logTypes);
          const completed = count >= quest.target;
          newProgress[quest.key] = { progress: count, completed, rewarded: existing?.rewarded ?? false };

          if (completed && !existing?.rewarded) {
            await grantXp("quest", quest.key, quest.xp);
            newProgress[quest.key].rewarded = true;
            await upsertQuestProgress(quest.key, weeklyKey, count, true, true);
          }
        }

        // Achievements (one-time)
        for (const ach of ACHIEVEMENTS) {
          if (currentUnlocked.has(ach.key)) continue;
          const totalCount = ach.logTypes
            ? logs.filter((l) => ach.logTypes!.includes(l.type)).length
            : logs.length;
          newProgress[ach.key] = {
            progress: Math.min(totalCount, ach.target),
            completed: totalCount >= ach.target,
            rewarded: currentUnlocked.has(ach.key),
          };
          if (totalCount >= ach.target) {
            const { error } = await supabase.from("achievements").insert({
              user_id: session.user.id,
              achievement_key: ach.key,
              xp_awarded: ach.xp,
            });
            if (!error) {
              await grantXp("achievement", ach.key, ach.xp);
              setUnlockedAchievements((prev) => new Set([...prev, ach.key]));
              newProgress[ach.key].rewarded = true;
            }
          }
        }

        // Challenges — schedule-aware on-time streaks per current reptile
        const reptile = currentReptileRef.current;
        // Use only logs for the currently selected reptile for streak calc
        const reptileLogs = reptile ? logs.filter((l) => l.reptileId === reptile.id) : logs;

        for (const chal of CHALLENGES) {
          if (currentUnlocked.has(chal.key)) continue;

          // Determine which logType to streak on
          const chalLogType = chal.logTypes?.[0] as "feeding" | "cleaning" | undefined;
          let streak = 0;
          if (chalLogType === "feeding" || chalLogType === "cleaning") {
            streak = getOnScheduleStreak(reptileLogs, chalLogType, reptile?.careSchedules);
          }

          newProgress[chal.key] = {
            progress: Math.min(streak, chal.target),
            completed: streak >= chal.target,
            rewarded: currentUnlocked.has(chal.key),
          };
          if (streak >= chal.target) {
            const { error } = await supabase.from("achievements").insert({
              user_id: session.user.id,
              achievement_key: chal.key,
              xp_awarded: chal.xp,
            });
            if (!error) {
              await grantXp("achievement", chal.key, chal.xp);
              setUnlockedAchievements((prev) => new Set([...prev, chal.key]));
              newProgress[chal.key].rewarded = true;
            }
          }
        }

        setQuestProgress(newProgress);
      } finally {
        evaluatingRef.current = false;
      }
    },
    [session?.user?.id, grantXp, upsertQuestProgress]
    // intentionally excludes questProgress/unlockedAchievements — read via refs instead
  );

  // Stable ref to evaluateQuests for the event listener
  const evaluateQuestsRef = useRef(evaluateQuests);
  useEffect(() => { evaluateQuestsRef.current = evaluateQuests; }, [evaluateQuests]);

  // Listen for log-added events (uses ref so listener is only registered once)
  useEffect(() => {
    const handler = () => {
      if (!session?.user) return;
      // allLogs may not yet reflect the new entry; use a short delay
      setTimeout(() => evaluateQuestsRef.current(allLogs), 100);
    };
    window.addEventListener("reptile:log-added", handler);
    return () => window.removeEventListener("reptile:log-added", handler);
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-evaluate when allLogs changes (handles initial load)
  useEffect(() => {
    if (isLoaded && session?.user && allLogs.length > 0) {
      evaluateQuests(allLogs);
    }
  }, [isLoaded, session?.user?.id, allLogs.length, evaluateQuests]);

  // gamification.ts already uses local time for streak calc
  // but we override it here for safety
  const generate3DModel = useCallback(
    async (reptileId: string, imageUrl: string) => {
      if (!session?.user) return;

      let publicImageUrl = imageUrl;
      if (imageUrl.startsWith("data:")) {
        const blob = await fetch(imageUrl).then((r) => r.blob());
        const fileName = `${session.user.id}/${reptileId}-3d-source.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, blob, { upsert: true });
        if (uploadError) {
          console.error("Failed to upload source image", uploadError);
          return;
        }
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
        publicImageUrl = urlData.publicUrl;
      }

      const res = await fetch("/api/meshy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", imageUrl: publicImageUrl }),
      });
      const data = await res.json();
      if (!data.result) {
        console.error("Meshy API error", data);
        return;
      }

      const taskId = data.result;
      await supabase.from("reptile_3d_models").upsert(
        {
          reptile_id: reptileId,
          user_id: session.user.id,
          task_id: taskId,
          status: "processing",
          source_image_url: publicImageUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "reptile_id" }
      );
      setModel3DStatus({ status: "processing", glbUrl: null, thumbnailUrl: null, taskId });
      startPolling(reptileId, taskId);
    },
    [session?.user?.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const startPolling = useCallback(
    (reptileId: string, taskId: string) => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollCountRef.current = 0;

      pollIntervalRef.current = setInterval(async () => {
        pollCountRef.current += 1;

        // Timeout after MAX_POLL_ATTEMPTS
        if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
          clearInterval(pollIntervalRef.current!);
          await supabase
            .from("reptile_3d_models")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("reptile_id", reptileId);
          setModel3DStatus({ status: "failed", glbUrl: null, thumbnailUrl: null, taskId });
          return;
        }

        try {
          const res = await fetch("/api/meshy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "poll", taskId }),
          });

          if (!res.ok) return; // retry on non-200

          const data = await res.json();

          if (data.status === "SUCCEEDED") {
            const glbUrl = data.model_urls?.glb ?? null;
            const thumbnailUrl = data.thumbnail_url ?? null;
            await supabase
              .from("reptile_3d_models")
              .update({ status: "succeeded", glb_url: glbUrl, thumbnail_url: thumbnailUrl, updated_at: new Date().toISOString() })
              .eq("reptile_id", reptileId);
            setModel3DStatus({ status: "succeeded", glbUrl, thumbnailUrl, taskId });
            clearInterval(pollIntervalRef.current!);
          } else if (data.status === "FAILED") {
            await supabase
              .from("reptile_3d_models")
              .update({ status: "failed", updated_at: new Date().toISOString() })
              .eq("reptile_id", reptileId);
            setModel3DStatus({ status: "failed", glbUrl: null, thumbnailUrl: null, taskId });
            clearInterval(pollIntervalRef.current!);
          }
        } catch (err) {
          console.error("Polling error:", err);
          // Don't clear interval — retry on next tick
        }
      }, 5000);
    },
    []
  );

  const fetchModel3DStatus = useCallback(
    async (reptileId: string) => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("reptile_3d_models")
        .select("*")
        .eq("reptile_id", reptileId)
        .single();

      if (data) {
        const status = data.status as Model3DStatus["status"];
        setModel3DStatus({
          status,
          glbUrl: data.glb_url,
          thumbnailUrl: data.thumbnail_url,
          taskId: data.task_id,
        });
        if (status === "processing" && data.task_id) {
          startPolling(reptileId, data.task_id);
        }
      }
    },
    [session?.user?.id, startPolling]
  );

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  return (
    <GamificationContext.Provider
      value={{
        totalXp,
        level,
        questProgress,
        unlockedAchievements,
        model3DStatus,
        isLoaded,
        generate3DModel,
        fetchModel3DStatus,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}
