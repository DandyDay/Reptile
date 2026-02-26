"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";
import { useReptileLogs, LogEntry } from "./store";
import {
  DAILY_QUESTS,
  WEEKLY_QUESTS,
  ACHIEVEMENTS,
  CHALLENGES,
  QuestDef,
  getDailyPeriodKey,
  getWeeklyPeriodKey,
  getFeedingStreak,
  getLevel,
  UNLOCK_3D_LEVEL,
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

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { session, allLogs } = useReptileLogs();
  const [totalXp, setTotalXp] = useState(0);
  const [questProgress, setQuestProgress] = useState<QuestProgressMap>({});
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [model3DStatus, setModel3DStatus] = useState<Model3DStatus | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const evaluatingRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const level = getLevel(totalXp);

  // Load initial state from Supabase
  useEffect(() => {
    if (!session?.user) {
      setIsLoaded(true);
      return;
    }
    loadGamificationData();
  }, [session?.user?.id]);

  const loadGamificationData = async () => {
    if (!session?.user) return;
    const userId = session.user.id;

    // Load total_xp from profiles
    const { data: profileData } = await supabase
      .from("profiles")
      .select("total_xp")
      .eq("id", userId)
      .single();
    if (profileData) setTotalXp(profileData.total_xp ?? 0);

    // Load quest progress for current periods
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

    // Load achievements
    const { data: achData } = await supabase
      .from("achievements")
      .select("achievement_key")
      .eq("user_id", userId);
    if (achData) {
      setUnlockedAchievements(new Set(achData.map((a) => a.achievement_key)));
    }

    setIsLoaded(true);
  };

  // Listen for log-added events
  useEffect(() => {
    const handler = () => {
      if (!session?.user) return;
      evaluateQuests(allLogs);
    };
    window.addEventListener("reptile:log-added", handler);
    return () => window.removeEventListener("reptile:log-added", handler);
  }, [session?.user?.id, allLogs]);

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
        if (typeof newXp === "number") {
          setTotalXp(newXp);
        }
        // Fire XP gain event for toast
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

  const evaluateQuests = useCallback(
    async (logs: LogEntry[]) => {
      if (!session?.user || evaluatingRef.current) return;
      evaluatingRef.current = true;

      try {
        const dailyKey = getDailyPeriodKey();
        const weeklyKey = getWeeklyPeriodKey();
        const today = new Date().toISOString().split("T")[0];
        const newProgress: QuestProgressMap = { ...questProgress };

        // Helper: count logs for a period
        const countLogs = (periodStart: string, periodEnd: string, logTypes?: string[]) => {
          return logs.filter((l) => {
            const d = l.date.split("T")[0];
            const inPeriod = d >= periodStart && d <= periodEnd;
            const typeMatch = !logTypes || logTypes.includes(l.type);
            return inPeriod && typeMatch;
          }).length;
        };

        // Count unique feeding DAYS this week (for weekly_feed_7)
        const getWeeklyFeedingDays = () => {
          const monday = new Date();
          monday.setHours(0, 0, 0, 0);
          const day = monday.getDay();
          monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
          const mondayStr = monday.toISOString().split("T")[0];
          const feedingDays = new Set(
            logs
              .filter((l) => l.type === "feeding" && l.date.split("T")[0] >= mondayStr)
              .map((l) => l.date.split("T")[0])
          );
          return feedingDays.size;
        };

        // Evaluate daily quests
        for (const quest of DAILY_QUESTS) {
          const existing = newProgress[quest.key];
          if (existing?.rewarded) continue;

          let count: number;
          if (quest.key === "daily_any") {
            count = countLogs(today, today, undefined);
          } else {
            count = countLogs(today, today, quest.logTypes);
          }

          const completed = count >= quest.target;
          newProgress[quest.key] = { progress: count, completed, rewarded: existing?.rewarded ?? false };

          if (completed && !existing?.rewarded) {
            await grantXp("quest", quest.key, quest.xp);
            newProgress[quest.key].rewarded = true;
            await upsertQuestProgress(quest.key, dailyKey, count, true, true);
          }
        }

        // Evaluate weekly quests
        const monday = new Date();
        monday.setHours(0, 0, 0, 0);
        const day = monday.getDay();
        monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
        const mondayStr = monday.toISOString().split("T")[0];

        for (const quest of WEEKLY_QUESTS) {
          const existing = newProgress[quest.key];
          if (existing?.rewarded) continue;

          let count: number;
          if (quest.key === "weekly_feed_7") {
            count = getWeeklyFeedingDays();
          } else {
            count = countLogs(mondayStr, today, quest.logTypes);
          }

          const completed = count >= quest.target;
          newProgress[quest.key] = { progress: count, completed, rewarded: existing?.rewarded ?? false };

          if (completed && !existing?.rewarded) {
            await grantXp("quest", quest.key, quest.xp);
            newProgress[quest.key].rewarded = true;
            await upsertQuestProgress(quest.key, weeklyKey, count, true, true);
          }
        }

        // Evaluate achievements
        for (const ach of ACHIEVEMENTS) {
          if (unlockedAchievements.has(ach.key)) continue;

          const totalCount = ach.logTypes
            ? logs.filter((l) => ach.logTypes!.includes(l.type)).length
            : logs.length;

          newProgress[ach.key] = {
            progress: Math.min(totalCount, ach.target),
            completed: totalCount >= ach.target,
            rewarded: unlockedAchievements.has(ach.key),
          };

          if (totalCount >= ach.target) {
            // Try to insert achievement (UNIQUE constraint prevents duplicates)
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

        // Evaluate challenges (streak-based)
        const streak = getFeedingStreak(logs);
        for (const chal of CHALLENGES) {
          if (unlockedAchievements.has(chal.key)) continue;
          newProgress[chal.key] = {
            progress: Math.min(streak, chal.target),
            completed: streak >= chal.target,
            rewarded: unlockedAchievements.has(chal.key),
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
    [session?.user?.id, questProgress, unlockedAchievements, grantXp, upsertQuestProgress]
  );

  // Re-evaluate on allLogs change (for initial load and after log refresh)
  useEffect(() => {
    if (isLoaded && session?.user && allLogs.length > 0) {
      evaluateQuests(allLogs);
    }
  }, [isLoaded, session?.user?.id, allLogs.length]);

  // 3D Model generation
  const generate3DModel = useCallback(
    async (reptileId: string, imageUrl: string) => {
      if (!session?.user) return;

      // If imageUrl is a data URI, upload to Supabase first
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

      // Call Meshy API via our proxy route
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

      // Save to Supabase
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

      // Start polling
      startPolling(reptileId, taskId);
    },
    [session?.user?.id]
  );

  const startPolling = useCallback(
    (reptileId: string, taskId: string) => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(async () => {
        const res = await fetch("/api/meshy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "poll", taskId }),
        });
        const data = await res.json();

        if (data.status === "SUCCEEDED") {
          const glbUrl = data.model_urls?.glb ?? null;
          const thumbnailUrl = data.thumbnail_url ?? null;

          await supabase
            .from("reptile_3d_models")
            .update({
              status: "succeeded",
              glb_url: glbUrl,
              thumbnail_url: thumbnailUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("reptile_id", reptileId);

          setModel3DStatus({ status: "succeeded", glbUrl, thumbnailUrl, taskId });
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        } else if (data.status === "FAILED") {
          await supabase
            .from("reptile_3d_models")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("reptile_id", reptileId);

          setModel3DStatus({ status: "failed", glbUrl: null, thumbnailUrl: null, taskId });
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
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
        // Resume polling if still processing
        if (status === "processing" && data.task_id) {
          startPolling(reptileId, data.task_id);
        }
      }
    },
    [session?.user?.id, startPolling]
  );

  // Cleanup polling on unmount
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
