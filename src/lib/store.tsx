"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// Fallback for crypto.randomUUID() which might be unavailable in non-secure contexts or older browsers
const generateId = () => {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
    } catch (e) {
        // Fallback to manual generation
    }
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
};

export type LogType = "feeding" | "poop" | "cleaning" | "memo" | "weight";

export interface CareSchedule {
    type: "feeding" | "cleaning";
    scheduleMode: "interval" | "weekly";
    frequencyDays?: number;
    specificDays?: number[]; // 0 for Sunday, 1 for Monday, etc.
    enabled: boolean;
}

export interface Reptile {
    id: string;
    name: string;
    species: string;
    color: string;
    avatar: string;
    birthday?: string; // ISO string, optional
    notes?: string; // Profile notes for personality, etc.
    careSchedules?: CareSchedule[];
}

export interface FoodPreset {
    id: string;
    name: string;
    emoji: string;
    unit: "마리" | "g" | "개" | "pieces" | "grams" | "items";
}

export interface UserProfile {
    name: string;
    avatar: string; // Emoji
    bio: string;
}

export interface LogEntry {
    id: string;
    reptileId: string;
    type: LogType;
    date: string; // ISO string
    note?: string;
    details?: string; // e.g., "Crickets x5" for feeding, or weight "45g"
    emoji?: string; // Emoji for feeding logs
    weight?: number; // Numeric weight value for graphing
}

interface ReptileContextType {
    logs: LogEntry[];
    allLogs: LogEntry[];
    reptiles: Reptile[];
    selectedReptileId: string;
    setSelectedReptileId: (id: string) => void;
    addReptile: (reptile: Omit<Reptile, "id">) => void;
    updateReptile: (id: string, reptile: Partial<Omit<Reptile, "id">>) => void;
    deleteReptile: (id: string) => void;
    currentReptile: Reptile;
    addLog: (entry: Omit<LogEntry, "id" | "reptileId">) => void;
    deleteLog: (id: string) => void;
    isLoaded: boolean;
    visualSettings: {
        calViewMode: "dot" | "emoji";
        language: "ko" | "en";
        theme: "dark" | "light" | "custom";
        customColors: {
            background: string;
            card: string;
            primary: string;
            secondary: string;
            accent: string;
            text: string;
            border: string;
            muted: string;
            feeding: string;
            poop: string;
            cleaning: string;
            memo: string;
            success: string;
            danger: string;
        }
    };
    setCalViewMode: (mode: "dot" | "emoji") => void;
    setLanguage: (lang: "ko" | "en") => void;
    setTheme: (theme: "dark" | "light" | "custom") => void;
    setCustomColor: (key: string, color: string) => void;
    exportTheme: () => void;
    importTheme: (json: string) => void;
    foodPresets: FoodPreset[];
    addFoodPreset: (preset: Omit<FoodPreset, "id">) => void;
    deleteFoodPreset: (id: string) => void;
    userProfile: UserProfile | null;
    updateUserProfile: (profile: Partial<UserProfile>) => void;
    session: Session | null;
}

const ReptileContext = createContext<ReptileContextType | null>(null);

const STORAGE_KEY = "reptile-logs-v1";
const REPTILE_KEY = "reptile-list-v1";

export function ReptileProvider({ children }: { children: React.ReactNode }) {
    const [reptiles, setReptiles] = useState<Reptile[]>([]);
    // Default to null initially to allow useEffect to set it correctly from storage or first item
    const [selectedReptileId, setSelectedReptileId] = useState<string>("default");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        // Initialize session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const storedLogs = localStorage.getItem(STORAGE_KEY);
        const storedReptiles = localStorage.getItem(REPTILE_KEY);

        if (storedReptiles) {
            try {
                const parsedReptiles = JSON.parse(storedReptiles);
                setReptiles(parsedReptiles);
                if (parsedReptiles.length > 0) {
                    // Optionally restore last selected, but for now default to first
                    setSelectedReptileId(parsedReptiles[0].id);
                }
            } catch (e) {
                console.error("Failed to parse reptiles", e);
            }
        } else {
            // No stored reptiles, initialize with localized default
            const storedVisual = localStorage.getItem("reptile-visual-settings-v1");
            let lang = "ko";
            if (storedVisual) {
                try {
                    const parsed = JSON.parse(storedVisual);
                    lang = parsed.language || "ko";
                } catch (e) { }
            }
            const name = lang === 'ko' ? "내 파충류" : "My Reptile";
            const species = lang === 'ko' ? "게코" : "Gecko";
            setReptiles([{ id: "default", name, species, color: "emerald", avatar: "🦎" }]);
        }

        if (storedLogs) {
            try {
                const parsedLogs = JSON.parse(storedLogs);
                // Migration: If logs have no reptileId, assign to default
                const migratedLogs = parsedLogs.map((log: any) => ({
                    ...log,
                    reptileId: log.reptileId || "default"
                }));
                setLogs(migratedLogs);
            } catch (e) {
                console.error("Failed to parse logs", e);
            }
        }

        const storedProfile = localStorage.getItem("reptile-user-profile-v1");
        if (storedProfile) {
            try {
                setUserProfile(JSON.parse(storedProfile));
            } catch (e) { }
        }

        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
            localStorage.setItem(REPTILE_KEY, JSON.stringify(reptiles));
        }
    }, [logs, reptiles, isLoaded]);

    const addLog = (entry: Omit<LogEntry, "id" | "reptileId">) => {
        const newLog = {
            ...entry,
            id: generateId(),
            reptileId: selectedReptileId
        };
        setLogs((prev) => [newLog, ...prev]);
    };

    const deleteLog = (id: string) => {
        setLogs((prev) => prev.filter((l) => l.id !== id));
    };

    const addReptile = (reptile: Omit<Reptile, "id">) => {
        const newReptile = { ...reptile, id: generateId() };
        setReptiles(prev => [...prev, newReptile]);
        setSelectedReptileId(newReptile.id);
    };

    const updateReptile = (id: string, updatedFields: Partial<Omit<Reptile, "id">>) => {
        setReptiles(prev => prev.map(r => r.id === id ? { ...r, ...updatedFields } : r));
    };

    const deleteReptile = (id: string) => {
        // Prevent deleting if it's the only one left
        if (reptiles.length <= 1) {
            alert("You must have at least one reptile profile.");
            return;
        }

        const updatedReptiles = reptiles.filter(r => r.id !== id);
        setReptiles(updatedReptiles);
        setLogs(prev => prev.filter(l => l.reptileId !== id));

        // If we deleted the current reptile, switch to the first one available
        if (selectedReptileId === id) {
            setSelectedReptileId(updatedReptiles[0].id);
        }
    };

    const currentReptile = reptiles.find(r => r.id === selectedReptileId) || reptiles[0];
    const currentLogs = logs.filter(l => l.reptileId === selectedReptileId);

    const [visualSettings, setVisualSettings] = useState({
        calViewMode: "dot" as "dot" | "emoji",
        language: "ko" as "ko" | "en",
        theme: "dark" as "dark" | "light" | "custom",
        customColors: {
            background: "#0f172a",
            card: "rgba(30, 41, 59, 0.7)",
            primary: "#10b981",
            secondary: "#334155",
            accent: "#06b6d4",
            text: "#f8fafc",
            border: "rgba(255, 255, 255, 0.1)",
            muted: "#64748b",
            feeding: "#10b981",
            poop: "#d97706",
            cleaning: "#3b82f6",
            memo: "#a855f7",
            success: "#10b981",
            danger: "#ef4444",
            weight: "#ec4899"
        }
    });

    useEffect(() => {
        const stored = localStorage.getItem("reptile-visual-settings-v1");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setVisualSettings(prev => ({
                    ...prev,
                    ...parsed,
                    customColors: {
                        ...prev.customColors,
                        ...(parsed.customColors || {})
                    }
                }));
            } catch (e) {
                console.error("Failed to parse visual settings", e);
            }
        }
    }, []);

    const setCalViewMode = (mode: "dot" | "emoji") => {
        const newSettings = { ...visualSettings, calViewMode: mode };
        setVisualSettings(newSettings);
        localStorage.setItem("reptile-visual-settings-v1", JSON.stringify(newSettings));
    };

    const setLanguage = (lang: "ko" | "en") => {
        const newSettings = { ...visualSettings, language: lang };
        setVisualSettings(newSettings);
        localStorage.setItem("reptile-visual-settings-v1", JSON.stringify(newSettings));
    };

    const setTheme = (theme: "dark" | "light" | "custom") => {
        const newSettings = { ...visualSettings, theme };
        setVisualSettings(newSettings);
        localStorage.setItem("reptile-visual-settings-v1", JSON.stringify(newSettings));
    };

    const setCustomColor = (key: string, color: string) => {
        const newSettings = {
            ...visualSettings,
            theme: "custom" as const,
            customColors: {
                ...visualSettings.customColors,
                [key]: color
            }
        };
        setVisualSettings(newSettings);
        localStorage.setItem("reptile-visual-settings-v1", JSON.stringify(newSettings));
    };

    const exportTheme = () => {
        const themeData = {
            name: "Custom Theme",
            version: "1.0",
            colors: visualSettings.customColors
        };
        const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `reptile-theme-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const importTheme = (json: string) => {
        try {
            const parsed = JSON.parse(json);
            if (parsed.colors) {
                const newSettings = {
                    ...visualSettings,
                    theme: "custom" as const,
                    customColors: {
                        ...visualSettings.customColors,
                        ...parsed.colors
                    }
                };
                setVisualSettings(newSettings);
                localStorage.setItem("reptile-visual-settings-v1", JSON.stringify(newSettings));
            }
        } catch (e) {
            console.error("Failed to import theme", e);
            alert("Invalid theme file");
        }
    };

    // Apply theme to CSS variables
    useEffect(() => {
        const root = document.documentElement;
        const colors = visualSettings.theme === 'light' ? {
            background: "#f8fafc",
            card: "rgba(255, 255, 255, 0.8)",
            primary: "#10b981",
            secondary: "rgba(15, 23, 42, 0.05)",
            accent: "#06b6d4",
            text: "#0f172a",
            border: "rgba(15, 23, 42, 0.1)",
            muted: "#64748b",
            feeding: "#10b981",
            poop: "#d97706",
            cleaning: "#3b82f6",
            memo: "#a855f7",
            success: "#10b981",
            danger: "#ef4444"
        } : visualSettings.theme === 'dark' ? {
            background: "#0f172a",
            card: "rgba(30, 41, 59, 0.7)",
            primary: "#10b981",
            secondary: "rgba(255, 255, 255, 0.1)",
            accent: "#06b6d4",
            text: "#f8fafc",
            border: "rgba(255, 255, 255, 0.1)",
            muted: "#94a3b8",
            feeding: "#10b981",
            poop: "#d97706",
            cleaning: "#3b82f6",
            memo: "#a855f7",
            success: "#10b981",
            danger: "#ef4444",
            weight: "#ec4899"
        } : {
            ...visualSettings.customColors,
        } as any;

        root.style.setProperty('--background', colors.background);
        root.style.setProperty('--card', colors.card);
        root.style.setProperty('--primary', colors.primary);
        root.style.setProperty('--secondary', colors.secondary);
        root.style.setProperty('--accent', colors.accent);
        root.style.setProperty('--foreground', colors.text);
        root.style.setProperty('--border', colors.border);
        root.style.setProperty('--muted', colors.muted);
        root.style.setProperty('--color-feeding', colors.feeding);
        root.style.setProperty('--color-poop', colors.poop);
        root.style.setProperty('--color-cleaning', colors.cleaning);
        root.style.setProperty('--color-memo', colors.memo);
        root.style.setProperty('--destructive', colors.danger);

        root.style.setProperty('--background', colors.background);
        root.style.setProperty('--card', colors.card);
        root.style.setProperty('--primary', colors.primary);
        root.style.setProperty('--foreground', colors.text);
        root.style.setProperty('--border', colors.border);
        root.style.setProperty('--muted', colors.muted);
        root.style.setProperty('--color-feeding', colors.feeding);
        root.style.setProperty('--color-poop', colors.poop);
        root.style.setProperty('--color-cleaning', colors.cleaning);
        root.style.setProperty('--color-memo', colors.memo);

        // Add dynamic background radial gradients
        const gradientColor = visualSettings.theme === 'light' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.15)';
        root.style.backgroundImage = `
            radial-gradient(at 0% 0%, ${gradientColor} 0px, transparent 50%),
            radial-gradient(at 100% 100%, ${gradientColor} 0px, transparent 50%)
        `;

        if (visualSettings.theme === 'light') {
            root.classList.add('light');
            root.classList.remove('dark');
        } else {
            root.classList.add('dark');
            root.classList.remove('light');
        }
    }, [visualSettings.theme, visualSettings.customColors]);

    // Food Presets Management
    const getDefaultPresets = (lang: "ko" | "en"): FoodPreset[] => {
        if (lang === "ko") {
            return [
                { id: "preset-1", name: "귀뚜라미", emoji: "🦗", unit: "마리" },
                { id: "preset-2", name: "밀웜", emoji: "🐛", unit: "마리" },
                { id: "preset-3", name: "듀비아 바퀴벌레", emoji: "🪳", unit: "마리" },
                { id: "preset-4", name: "슈퍼밀웜", emoji: "🐛", unit: "마리" },
                { id: "preset-5", name: "채소", emoji: "🥗", unit: "g" },
                { id: "preset-6", name: "과일", emoji: "🍎", unit: "g" },
            ];
        } else {
            return [
                { id: "preset-1", name: "Crickets", emoji: "🦗", unit: "pieces" },
                { id: "preset-2", name: "Mealworms", emoji: "🐛", unit: "pieces" },
                { id: "preset-3", name: "Dubia Roaches", emoji: "🪳", unit: "pieces" },
                { id: "preset-4", name: "Superworms", emoji: "🐛", unit: "pieces" },
                { id: "preset-5", name: "Vegetables", emoji: "🥗", unit: "grams" },
                { id: "preset-6", name: "Fruits", emoji: "🍎", unit: "grams" },
            ];
        }
    };

    const [foodPresets, setFoodPresets] = useState<FoodPreset[]>(getDefaultPresets(visualSettings.language));

    useEffect(() => {
        const stored = localStorage.getItem("reptile-food-presets-v1");
        if (stored) {
            try {
                setFoodPresets(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse food presets", e);
            }
        }
    }, []);

    const addFoodPreset = (preset: Omit<FoodPreset, "id">) => {
        const newPreset = { ...preset, id: `preset-${Date.now()}` };
        const updated = [...foodPresets, newPreset];
        setFoodPresets(updated);
        localStorage.setItem("reptile-food-presets-v1", JSON.stringify(updated));
    };

    const deleteFoodPreset = (id: string) => {
        const updated = foodPresets.filter(p => p.id !== id);
        setFoodPresets(updated);
        localStorage.setItem("reptile-food-presets-v1", JSON.stringify(updated));
    };

    const updateUserProfile = (profile: Partial<UserProfile>) => {
        const newProfile = userProfile ? { ...userProfile, ...profile } : { name: "", avatar: "👤", bio: "", ...profile };
        setUserProfile(newProfile as UserProfile);
        localStorage.setItem("reptile-user-profile-v1", JSON.stringify(newProfile));
    };

    const value = {
        logs: currentLogs,
        allLogs: logs,
        reptiles,
        selectedReptileId,
        setSelectedReptileId,
        addReptile,
        updateReptile,
        deleteReptile,
        currentReptile,
        addLog,
        deleteLog,
        isLoaded,
        visualSettings,
        setCalViewMode,
        setLanguage,
        setTheme,
        setCustomColor,
        exportTheme,
        importTheme,
        foodPresets,
        addFoodPreset,
        deleteFoodPreset,
        userProfile,
        updateUserProfile,
        session
    };

    return (
        <ReptileContext.Provider value={value} >
            {children}
        </ReptileContext.Provider>
    );
}

export function useReptileLogs() {
    const context = useContext(ReptileContext);
    if (!context) {
        throw new Error("useReptileLogs must be used within a ReptileProvider");
    }
    return context;
}
