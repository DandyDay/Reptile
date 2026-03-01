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
  progress: number;       // For challenges: current streak; others: count
  completed: boolean;
  rewarded: boolean;
  completions?: number;   // For repeatable challenges: how many times completed
  lastRewardedAt?: string; // For repeatable challenges: ISO timestamp of last completion
}

export type QuestProgressMap = Record<string, QuestProgressEntry>;

export interface Model3DStatus {
  status: "pending" | "processing" | "succeeded" | "failed";
  glbUrl: string | null;
  thumbnailUrl: string | null;
  taskId: string | null;
}

interface GamificationContextType {
  totalXp: number;   // Current reptile's XP
  level: number;     // Current reptile's level
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

// Local date string (avoids UTC offset issues)
function localDateStr(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMondayStr(): string {
  const now = new Date();
  const day = now.getDay();
  now.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return localDateStr(now);
}

function logLocalDate(dateStr: string): string {
  return localDateStr(new Date(dateStr));
}

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { session, allLogs, currentReptile, reptiles } = useReptileLogs();

  // Per-reptile XP state
  const [totalXp, setTotalXp] = useState(0);
  const [questProgress, setQuestProgress] = useState<QuestProgressMap>({});
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [model3DStatus, setModel3DStatus] = useState<Model3DStatus | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const questProgressRef = useRef<QuestProgressMap>({});
  const unlockedAchievementsRef = useRef<Set<string>>(new Set());
  const currentReptileRef = useRef<Reptile | null>(null);
  const evaluatingRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLL_ATTEMPTS = 120;
  const prevReptileIdRef = useRef<string | null>(null);

  // Keep refs in sync
  useEffect(() => { questProgressRef.current = questProgress; }, [questProgress]);
  useEffect(() => { unlockedAchievementsRef.current = unlockedAchievements; }, [unlockedAchievements]);
  useEffect(() => { currentReptileRef.current = currentReptile ?? null; }, [currentReptile]);

  const level = getLevel(totalXp);

  // Load gamification data for a specific reptile
  const loadForReptile = useCallback(async (userId: string, reptileId: string) => {
    setIsLoaded(false);

    // Load reptile's XP
    const { data: reptileData } = await supabase
      .from("reptiles")
      .select("total_xp")
      .eq("id", reptileId)
      .eq("user_id", userId)
      .single();
    setTotalXp(reptileData?.total_xp ?? 0);

    // Load quest progress for this reptile + current periods
    const dailyKey = getDailyPeriodKey();
    const weeklyKey = getWeeklyPeriodKey();
    const { data: progressData } = await supabase
      .from("quest_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("reptile_id", reptileId)
      .in("period_key", [dailyKey, weeklyKey]);

    const map: QuestProgressMap = {};
    for (const row of progressData ?? []) {
      map[row.quest_key] = {
        progress: row.progress,
        completed: row.completed,
        rewarded: row.rewarded_at != null,
      };
    }

    // Also check if daily_open_app was already rewarded today (user-level, no reptile_id)
    const { data: openAppRow } = await supabase
      .from("quest_progress")
      .select("rewarded_at")
      .eq("user_id", userId)
      .is("reptile_id", null)
      .eq("quest_key", "daily_open_app")
      .eq("period_key", dailyKey)
      .maybeSingle();
    const alreadyCheckedIn = openAppRow?.rewarded_at != null;
    map["daily_open_app"] = {
      progress: alreadyCheckedIn ? 1 : 0,
      completed: alreadyCheckedIn,
      rewarded: alreadyCheckedIn,
    };

    setQuestProgress(map);

    // Load challenge progress from quest_progress (repeatable, period_key = "challenge")
    const { data: challengeData } = await supabase
      .from("quest_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("reptile_id", reptileId)
      .eq("period_key", "challenge");

    for (const chal of CHALLENGES) {
      const chalRow = (challengeData ?? []).find((r) => r.quest_key === chal.key);
      map[chal.key] = {
        progress: 0,       // current streak — computed in evaluateQuests
        completed: false,
        rewarded: false,
        completions: chalRow?.progress ?? 0,
        lastRewardedAt: chalRow?.rewarded_at ?? undefined,
      };
    }

    // Load achievements for this reptile (only true achievements, not challenges)
    const challengeKeys = new Set(CHALLENGES.map((c) => c.key));
    const { data: achData } = await supabase
      .from("achievements")
      .select("achievement_key")
      .eq("user_id", userId)
      .eq("reptile_id", reptileId);
    setUnlockedAchievements(new Set(
      (achData ?? []).map((a) => a.achievement_key).filter((k) => !challengeKeys.has(k))
    ));

    // Auto-grant daily check-in (reptile-agnostic: once per day per user)
    if (!alreadyCheckedIn) {
      const openAppXp = 2;
      // Grant XP to this reptile
      const { data: newXp } = await supabase.rpc("grant_xp", {
        p_user_id: userId,
        p_reptile_id: reptileId,
        p_source: "quest",
        p_source_key: "daily_open_app",
        p_xp_delta: openAppXp,
      });
      if (typeof newXp === "number") setTotalXp(newXp);
      // Record as user-level (reptile_id = null) so it only fires once per day
      await supabase.from("quest_progress").upsert(
        {
          user_id: userId,
          reptile_id: null,
          quest_key: "daily_open_app",
          period_key: dailyKey,
          progress: 1,
          completed: true,
          rewarded_at: new Date().toISOString(),
        },
        { onConflict: "user_id,reptile_id,quest_key,period_key" }
      );
      setQuestProgress((prev) => ({
        ...prev,
        daily_open_app: { progress: 1, completed: true, rewarded: true },
      }));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("xp-gain", { detail: { xp: openAppXp } }));
      }, 1500);
    }

    setIsLoaded(true);
  }, []);

  // Re-load when session or selected reptile changes
  useEffect(() => {
    if (!session?.user) {
      setIsLoaded(true);
      return;
    }
    const reptileId = currentReptile?.id;
    if (!reptileId) return;
    // Only reload if reptile actually changed
    if (reptileId === prevReptileIdRef.current) return;
    prevReptileIdRef.current = reptileId;
    loadForReptile(session.user.id, reptileId);
  }, [session?.user?.id, currentReptile?.id, loadForReptile]);

  // Grant XP to the current reptile
  const grantXp = useCallback(
    async (source: string, sourceKey: string, xpDelta: number) => {
      const userId = session?.user?.id;
      const reptileId = currentReptileRef.current?.id;
      if (!userId || !reptileId) return;
      try {
        const { data: newXp } = await supabase.rpc("grant_xp", {
          p_user_id: userId,
          p_reptile_id: reptileId,
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
      const userId = session?.user?.id;
      const reptileId = currentReptileRef.current?.id;
      if (!userId || !reptileId) return;
      await supabase.from("quest_progress").upsert(
        {
          user_id: userId,
          reptile_id: reptileId,
          quest_key: questKey,
          period_key: periodKey,
          progress,
          completed,
          rewarded_at: rewarded ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,reptile_id,quest_key,period_key" }
      );
    },
    [session?.user?.id]
  );

  // Quest evaluation: uses refs to avoid stale closures
  const evaluateQuests = useCallback(
    async (logs: LogEntry[]) => {
      const userId = session?.user?.id;
      const reptile = currentReptileRef.current;
      if (!userId || !reptile || evaluatingRef.current) return;
      evaluatingRef.current = true;

      try {
        const currentQuestProgress = questProgressRef.current;
        const currentUnlocked = unlockedAchievementsRef.current;

        const today = localDateStr();
        const dailyKey = getDailyPeriodKey();
        const weeklyKey = getWeeklyPeriodKey();
        const mondayStr = getMondayStr();

        const newProgress: QuestProgressMap = { ...currentQuestProgress };

        // Filter logs to current reptile
        const reptileLogs = logs.filter((l) => l.reptileId === reptile.id);

        const countLogs = (periodStart: string, periodEnd: string, logTypes?: string[]) =>
          reptileLogs.filter((l) => {
            const d = logLocalDate(l.date);
            return d >= periodStart && d <= periodEnd && (!logTypes || logTypes.includes(l.type));
          }).length;

        const weeklyFeedingDayCount = new Set(
          reptileLogs
            .filter((l) => l.type === "feeding" && logLocalDate(l.date) >= mondayStr)
            .map((l) => logLocalDate(l.date))
        ).size;

        // Daily quests (skip daily_open_app — auto-handled on load)
        for (const quest of DAILY_QUESTS) {
          if (quest.key === "daily_open_app") continue;
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

          const count = quest.key === "weekly_feed_on_time"
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

        // Achievements (per-reptile)
        for (const ach of ACHIEVEMENTS) {
          if (currentUnlocked.has(ach.key)) continue;
          const totalCount = ach.logTypes
            ? reptileLogs.filter((l) => ach.logTypes!.includes(l.type)).length
            : reptileLogs.length;
          newProgress[ach.key] = {
            progress: Math.min(totalCount, ach.target),
            completed: totalCount >= ach.target,
            rewarded: currentUnlocked.has(ach.key),
          };
          if (totalCount >= ach.target) {
            const { error } = await supabase.from("achievements").insert({
              user_id: userId,
              reptile_id: reptile.id,
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

        // Challenges — repeatable, schedule-aware streaks
        for (const chal of CHALLENGES) {
          const existing = newProgress[chal.key];
          const completions = existing?.completions ?? 0;
          const sinceLocalDate = existing?.lastRewardedAt
            ? localDateStr(new Date(existing.lastRewardedAt))
            : undefined;

          const chalLogType = chal.logTypes?.[0] as "feeding" | "cleaning" | undefined;
          let streak = 0;
          if (chalLogType === "feeding" || chalLogType === "cleaning") {
            streak = getOnScheduleStreak(reptileLogs, chalLogType, reptile.careSchedules, sinceLocalDate);
          }

          if (streak >= chal.target) {
            // Completed! Grant XP, record in quest_progress, reset streak
            const newCompletions = completions + 1;
            const nowIso = new Date().toISOString();
            await grantXp("challenge", chal.key, chal.xp);
            await supabase.from("quest_progress").upsert(
              {
                user_id: userId,
                reptile_id: reptile.id,
                quest_key: chal.key,
                period_key: "challenge",
                progress: newCompletions,
                completed: false,
                rewarded_at: nowIso,
              },
              { onConflict: "user_id,reptile_id,quest_key,period_key" }
            );
            newProgress[chal.key] = {
              progress: 0,      // streak resets after completion
              completed: false,
              rewarded: false,
              completions: newCompletions,
              lastRewardedAt: nowIso,
            };
          } else {
            newProgress[chal.key] = {
              progress: streak,
              completed: false,
              rewarded: false,
              completions,
              lastRewardedAt: existing?.lastRewardedAt,
            };
          }
        }

        setQuestProgress(newProgress);
      } finally {
        evaluatingRef.current = false;
      }
    },
    [session?.user?.id, grantXp, upsertQuestProgress]
  );

  const evaluateQuestsRef = useRef(evaluateQuests);
  useEffect(() => { evaluateQuestsRef.current = evaluateQuests; }, [evaluateQuests]);

  // Listen for log-added events
  useEffect(() => {
    const handler = () => {
      if (!session?.user) return;
      setTimeout(() => evaluateQuestsRef.current(allLogs), 100);
    };
    window.addEventListener("reptile:log-added", handler);
    return () => window.removeEventListener("reptile:log-added", handler);
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-evaluate when logs change
  useEffect(() => {
    if (isLoaded && session?.user && allLogs.length > 0) {
      evaluateQuests(allLogs);
    }
  }, [isLoaded, session?.user?.id, allLogs.length, evaluateQuests]);

  // 3D model generation
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
        if (uploadError) { console.error("Upload failed", uploadError); return; }
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
        publicImageUrl = urlData.publicUrl;
      }
      const res = await fetch("/api/meshy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", imageUrl: publicImageUrl }),
      });
      const data = await res.json();
      if (!data.result) { console.error("Meshy API error", data); return; }
      const taskId = data.result;
      await supabase.from("reptile_3d_models").upsert(
        { reptile_id: reptileId, user_id: session.user.id, task_id: taskId, status: "processing", source_image_url: publicImageUrl, updated_at: new Date().toISOString() },
        { onConflict: "reptile_id" }
      );
      setModel3DStatus({ status: "processing", glbUrl: null, thumbnailUrl: null, taskId });
      startPolling(reptileId, taskId);
    },
    [session?.user?.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const startPolling = useCallback((reptileId: string, taskId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollCountRef.current = 0;
    pollIntervalRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        clearInterval(pollIntervalRef.current!);
        await supabase.from("reptile_3d_models").update({ status: "failed", updated_at: new Date().toISOString() }).eq("reptile_id", reptileId);
        setModel3DStatus({ status: "failed", glbUrl: null, thumbnailUrl: null, taskId });
        return;
      }
      try {
        const res = await fetch("/api/meshy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "poll", taskId }) });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "SUCCEEDED") {
          const glbUrl = data.model_urls?.glb ?? null;
          const thumbnailUrl = data.thumbnail_url ?? null;
          await supabase.from("reptile_3d_models").update({ status: "succeeded", glb_url: glbUrl, thumbnail_url: thumbnailUrl, updated_at: new Date().toISOString() }).eq("reptile_id", reptileId);
          setModel3DStatus({ status: "succeeded", glbUrl, thumbnailUrl, taskId });
          clearInterval(pollIntervalRef.current!);
        } else if (data.status === "FAILED") {
          await supabase.from("reptile_3d_models").update({ status: "failed", updated_at: new Date().toISOString() }).eq("reptile_id", reptileId);
          setModel3DStatus({ status: "failed", glbUrl: null, thumbnailUrl: null, taskId });
          clearInterval(pollIntervalRef.current!);
        }
      } catch (err) { console.error("Polling error:", err); }
    }, 5000);
  }, []);

  const fetchModel3DStatus = useCallback(async (reptileId: string) => {
    if (!session?.user) return;
    const { data } = await supabase.from("reptile_3d_models").select("*").eq("reptile_id", reptileId).maybeSingle();
    if (data) {
      const status = data.status as Model3DStatus["status"];
      setModel3DStatus({ status, glbUrl: data.glb_url, thumbnailUrl: data.thumbnail_url, taskId: data.task_id });
      if (status === "processing" && data.task_id) startPolling(reptileId, data.task_id);
    }
  }, [session?.user?.id, startPolling]);

  useEffect(() => () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); }, []);

  return (
    <GamificationContext.Provider value={{ totalXp, level, questProgress, unlockedAchievements, model3DStatus, isLoaded, generate3DModel, fetchModel3DStatus }}>
      {children}
    </GamificationContext.Provider>
  );
}
