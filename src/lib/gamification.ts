import { LogEntry, CareSchedule } from "./store";

export type QuestType = "daily" | "weekly" | "achievement" | "challenge";

export interface QuestDef {
  key: string;
  type: QuestType;
  xp: number;
  target: number;
  logTypes?: string[];
  labelKo: string;
  labelEn: string;
  descKo: string;
  descEn: string;
  icon: string;
}

// Level system
export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200] as const;
export const LEVEL_NAMES_KO = ["해처링", "유체", "준성체", "성체", "원로", "레전드", "신화"] as const;
export const LEVEL_NAMES_EN = ["Hatchling", "Juvenile", "Sub-Adult", "Adult", "Elder", "Legend", "Mythic"] as const;
export const UNLOCK_3D_LEVEL = 5; // Level 5 = 1000 XP

export function getLevel(totalXp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function getXpProgress(totalXp: number): {
  level: number;
  current: number;
  required: number;
  isMaxLevel: boolean;
} {
  const level = getLevel(totalXp);
  const isMaxLevel = level >= LEVEL_THRESHOLDS.length;
  const currentThreshold = LEVEL_THRESHOLDS[Math.min(level - 1, LEVEL_THRESHOLDS.length - 1)];
  const nextThreshold = isMaxLevel ? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] : LEVEL_THRESHOLDS[level];
  const current = totalXp - currentThreshold;
  const required = nextThreshold - currentThreshold;
  return { level, current, required, isMaxLevel };
}

export function getLevelName(level: number, lang: "ko" | "en"): string {
  const idx = Math.min(level - 1, LEVEL_NAMES_KO.length - 1);
  return lang === "ko" ? LEVEL_NAMES_KO[idx] : LEVEL_NAMES_EN[idx];
}

// Local date string helper (avoids UTC offset issues)
function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Period key helpers (local dates)
export function getDailyPeriodKey(date: Date = new Date()): string {
  return localDateStr(date);
}

export function getWeeklyPeriodKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const year = d.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(
    ((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Schedule-aware on-time streak.
 *
 * Interval mode (e.g., every 3 days):
 *   - Counts consecutive care events where the gap to the previous event was
 *     within (frequencyDays × 1.5) days.  A 50% grace period is given.
 *   - Default interval when no schedule: 7 days.
 *
 * Weekly mode (e.g., every Mon & Thu):
 *   - Counts consecutive weeks (going backward) where all required days of the
 *     week have at least one log of the given type.
 */
export function getOnScheduleStreak(
  logs: LogEntry[],
  logType: "feeding" | "cleaning",
  careSchedules?: CareSchedule[]
): number {
  const schedule = careSchedules?.find((s) => s.type === logType && s.enabled);
  const typeLogs = logs
    .filter((l) => l.type === logType)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (typeLogs.length === 0) return 0;

  if (schedule?.scheduleMode === "weekly" && schedule.specificDays?.length) {
    return calcWeeklyScheduleStreak(typeLogs, schedule.specificDays);
  }

  // Interval mode
  const intervalDays = schedule?.frequencyDays ?? 7;
  const maxGapMs = intervalDays * 1.5 * 24 * 60 * 60 * 1000;
  return calcIntervalStreak(typeLogs, maxGapMs);
}

function calcIntervalStreak(typeLogs: LogEntry[], maxGapMs: number): number {
  let streak = 1;
  for (let i = typeLogs.length - 1; i > 0; i--) {
    const curr = new Date(typeLogs[i].date).getTime();
    const prev = new Date(typeLogs[i - 1].date).getTime();
    if (curr - prev <= maxGapMs) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function calcWeeklyScheduleStreak(typeLogs: LogEntry[], requiredDays: number[]): number {
  // Map weekKey → set of logged day-of-week values
  const logsByWeek = new Map<string, Set<number>>();
  for (const log of typeLogs) {
    const d = new Date(log.date);
    const weekKey = getWeeklyPeriodKey(d);
    if (!logsByWeek.has(weekKey)) logsByWeek.set(weekKey, new Set());
    logsByWeek.get(weekKey)!.add(d.getDay());
  }

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 52; i++) {
    const weekDate = new Date(today);
    weekDate.setDate(today.getDate() - i * 7);
    const weekKey = getWeeklyPeriodKey(weekDate);
    const loggedDays = logsByWeek.get(weekKey) ?? new Set<number>();
    const allCovered = requiredDays.every((d) => loggedDays.has(d));
    if (allCovered) streak++;
    else break;
  }
  return streak;
}

// Quest definitions

export const DAILY_QUESTS: QuestDef[] = [
  {
    key: "daily_open_app",
    type: "daily",
    xp: 2,
    target: 1,
    logTypes: undefined,
    labelKo: "오늘 출석",
    labelEn: "Daily Check-in",
    descKo: "오늘 앱에 접속했어요!",
    descEn: "You opened the app today!",
    icon: "📱",
  },
  {
    key: "daily_feed",
    type: "daily",
    xp: 10,
    target: 1,
    logTypes: ["feeding"],
    labelKo: "오늘 먹이주기",
    labelEn: "Feed Today",
    descKo: "파충류에게 먹이를 한 번 주세요",
    descEn: "Give your reptile a meal today",
    icon: "🦗",
  },
  {
    key: "daily_mist",
    type: "daily",
    xp: 5,
    target: 1,
    logTypes: ["misting"],
    labelKo: "오늘 물주기",
    labelEn: "Mist Today",
    descKo: "오늘 물주기를 기록하세요",
    descEn: "Log a misting session today",
    icon: "💧",
  },
  {
    key: "daily_any",
    type: "daily",
    xp: 3,
    target: 1,
    logTypes: undefined,
    labelKo: "오늘 케어 기록",
    labelEn: "Log Any Care",
    descKo: "아무 케어 활동을 기록하세요",
    descEn: "Record any care activity today",
    icon: "📋",
  },
];

export const WEEKLY_QUESTS: QuestDef[] = [
  {
    key: "weekly_clean_3x",
    type: "weekly",
    xp: 50,
    target: 3,
    logTypes: ["cleaning"],
    labelKo: "이번 주 청소 3회",
    labelEn: "Clean 3x This Week",
    descKo: "이번 주 청소를 3번 기록하세요",
    descEn: "Log 3 cleaning sessions this week",
    icon: "🧹",
  },
  {
    key: "weekly_feed_on_time",
    type: "weekly",
    xp: 60,
    target: 1,
    logTypes: ["feeding"],
    labelKo: "이번 주 먹이 기록",
    labelEn: "Feed This Week",
    descKo: "이번 주 먹이주기를 한 번 이상 기록하세요",
    descEn: "Log at least one feeding this week",
    icon: "📅",
  },
  {
    key: "weekly_weight",
    type: "weekly",
    xp: 25,
    target: 1,
    logTypes: ["weight"],
    labelKo: "이번 주 체중 측정",
    labelEn: "Log Weight",
    descKo: "이번 주 체중을 한 번 기록하세요",
    descEn: "Record weight once this week",
    icon: "⚖️",
  },
  {
    key: "weekly_memo_3",
    type: "weekly",
    xp: 20,
    target: 3,
    logTypes: ["memo"],
    labelKo: "이번 주 메모 3회",
    labelEn: "Write 3 Memos",
    descKo: "이번 주 메모를 3번 작성하세요",
    descEn: "Write 3 observation memos this week",
    icon: "📝",
  },
];

export const ACHIEVEMENTS: QuestDef[] = [
  {
    key: "first_feeding",
    type: "achievement",
    xp: 20,
    target: 1,
    logTypes: ["feeding"],
    labelKo: "첫 먹이주기",
    labelEn: "First Feeding",
    descKo: "파충류에게 처음으로 먹이를 줬어요",
    descEn: "Fed your reptile for the first time",
    icon: "🎉",
  },
  {
    key: "first_cleaning",
    type: "achievement",
    xp: 20,
    target: 1,
    logTypes: ["cleaning"],
    labelKo: "첫 청소",
    labelEn: "First Cleaning",
    descKo: "처음으로 서식지를 청소했어요",
    descEn: "Cleaned the enclosure for the first time",
    icon: "✨",
  },
  {
    key: "logs_30",
    type: "achievement",
    xp: 200,
    target: 30,
    logTypes: undefined,
    labelKo: "헌신적인 사육사",
    labelEn: "Dedicated Keeper",
    descKo: "케어 기록 30회 달성",
    descEn: "Logged 30 total care events",
    icon: "🏆",
  },
  {
    key: "feedings_50",
    type: "achievement",
    xp: 500,
    target: 50,
    logTypes: ["feeding"],
    labelKo: "먹이 마스터",
    labelEn: "Master Feeder",
    descKo: "먹이주기 50회 달성",
    descEn: "Fed your reptile 50 times",
    icon: "👑",
  },
];

/**
 * Challenges use schedule-aware streaks.
 * The `target` is the number of consecutive on-time completions required.
 * Evaluation happens in gamification-store.tsx using getOnScheduleStreak().
 */
export const CHALLENGES: QuestDef[] = [
  {
    key: "streak_feed_7",
    type: "challenge",
    xp: 150,
    target: 7,
    logTypes: ["feeding"],
    labelKo: "꾸준한 먹이 7번",
    labelEn: "7 On-Schedule Feedings",
    descKo: "설정한 주기에 맞춰 7번 연속으로 먹이주기를 완료하세요",
    descEn: "Complete 7 consecutive feedings on your set schedule",
    icon: "🔥",
  },
  {
    key: "streak_feed_30",
    type: "challenge",
    xp: 500,
    target: 30,
    logTypes: ["feeding"],
    labelKo: "꾸준한 먹이 30번",
    labelEn: "30 On-Schedule Feedings",
    descKo: "설정한 주기에 맞춰 30번 연속으로 먹이주기를 완료하세요",
    descEn: "Complete 30 consecutive feedings on your set schedule",
    icon: "⚡",
  },
  {
    key: "streak_clean_10",
    type: "challenge",
    xp: 200,
    target: 10,
    logTypes: ["cleaning"],
    labelKo: "꾸준한 청소 10번",
    labelEn: "10 On-Schedule Cleanings",
    descKo: "설정한 주기에 맞춰 10번 연속으로 청소를 완료하세요",
    descEn: "Complete 10 consecutive cleanings on your set schedule",
    icon: "🧼",
  },
];

export const ALL_QUESTS = [...DAILY_QUESTS, ...WEEKLY_QUESTS, ...ACHIEVEMENTS, ...CHALLENGES];
