"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "./supabase";

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
    addLog: (entry: Omit<LogEntry, "id" | "reptileId"> & { reptileId?: string }) => void;
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
            weight: string;
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

export function ReptileProvider({ children }: { children: React.ReactNode }) {
    const [reptiles, setReptiles] = useState<Reptile[]>([]);
    const [selectedReptileId, setSelectedReptileId] = useState<string>("");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [session, setSession] = useState<Session | null>(null);
    const [foodPresets, setFoodPresets] = useState<FoodPreset[]>([]);

    // Visual settings remain local for now (device preference)
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

    // 1. Initialize Auth
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Fetch Data from Supabase when session exists
    useEffect(() => {
        if (!session) {
            // Reset data if logged out
            setReptiles([]);
            setLogs([]);
            setFoodPresets([]);
            setUserProfile(null);
            setIsLoaded(true);
            return;
        }

        const fetchData = async () => {
            setIsLoaded(false);
            try {
                // Fetch Reptiles
                const { data: reptilesData } = await supabase
                    .from('reptiles')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (reptilesData) {
                    const mappedReptiles: Reptile[] = reptilesData.map(r => ({
                        id: r.id,
                        name: r.name,
                        species: r.species || "",
                        // @ts-ignore
                        color: r.color || "emerald",
                        avatar: r.photo_url || "🦎",
                        birthday: r.birth_date || undefined,
                        // @ts-ignore
                        notes: r.notes || undefined,
                        careSchedules: r.care_schedules as unknown as CareSchedule[] || []
                    }));
                    setReptiles(mappedReptiles);
                    if (mappedReptiles.length > 0) {
                        setSelectedReptileId(mappedReptiles[0].id);
                    }
                }

                // Fetch Logs
                const { data: logsData } = await supabase
                    .from('logs')
                    .select('*')
                    .order('date', { ascending: false });

                if (logsData) {
                    const mappedLogs: LogEntry[] = logsData.map(l => ({
                        id: l.id,
                        reptileId: l.reptile_id,
                        type: l.type as LogType,
                        date: l.date,
                        note: l.note || undefined,
                        details: l.details || undefined,
                        emoji: l.emoji || undefined,
                        weight: l.weight || undefined
                    }));
                    setLogs(mappedLogs);
                }

                // Fetch Food Presets
                const { data: presetsData } = await supabase
                    .from('food_presets')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (presetsData) {
                    const mappedPresets: FoodPreset[] = presetsData.map(p => ({
                        id: p.id,
                        name: p.name,
                        emoji: p.emoji,
                        unit: p.unit as any
                    }));
                    setFoodPresets(mappedPresets);
                }

                // Fetch Profile
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profileData) {
                    setUserProfile({
                        name: profileData.full_name || "",
                        avatar: profileData.avatar_url || "👤",
                        bio: profileData.bio || ""
                    });
                }

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoaded(true);
            }
        };

        fetchData();
    }, [session]);

    // Data Mutations

    const addReptile = async (reptile: Omit<Reptile, "id">) => {
        if (!session) return;
        const newId = crypto.randomUUID();
        const newReptile = { ...reptile, id: newId };

        // Optimistic update
        setReptiles(prev => [...prev, newReptile]);
        setSelectedReptileId(newId);

        const { error } = await supabase.from('reptiles').insert({
            id: newId,
            user_id: session.user.id,
            name: reptile.name,
            species: reptile.species,
            photo_url: reptile.avatar,
            birth_date: reptile.birthday,
            color: reptile.color,
            notes: reptile.notes,
            care_schedules: reptile.careSchedules as any
        });

        if (error) {
            console.error("Failed to add reptile", error);
            // Revert on error
            setReptiles(prev => prev.filter(r => r.id !== newId));
        }
    };

    const updateReptile = async (id: string, updatedFields: Partial<Omit<Reptile, "id">>) => {
        if (!session) return;

        // Optimistic
        setReptiles(prev => prev.map(r => r.id === id ? { ...r, ...updatedFields } : r));

        const updateData: any = {};
        if (updatedFields.name !== undefined) updateData.name = updatedFields.name;
        if (updatedFields.species !== undefined) updateData.species = updatedFields.species;
        if (updatedFields.avatar !== undefined) updateData.photo_url = updatedFields.avatar;
        if (updatedFields.birthday !== undefined) updateData.birth_date = updatedFields.birthday;
        if (updatedFields.color !== undefined) updateData.color = updatedFields.color;
        if (updatedFields.notes !== undefined) updateData.notes = updatedFields.notes;
        if (updatedFields.careSchedules !== undefined) updateData.care_schedules = updatedFields.careSchedules;

        const { error } = await supabase.from('reptiles').update(updateData).eq('id', id);

        if (error) console.error("Failed to update reptile", error);
    };

    const deleteReptile = async (id: string) => {
        if (!session) return;

        // Optimistic
        const previousReptiles = reptiles;
        const updatedReptiles = reptiles.filter(r => r.id !== id);
        setReptiles(updatedReptiles);
        setLogs(prev => prev.filter(l => l.reptileId !== id));

        if (selectedReptileId === id && updatedReptiles.length > 0) {
            setSelectedReptileId(updatedReptiles[0].id);
        } else if (updatedReptiles.length === 0) {
            setSelectedReptileId("");
        }

        const { error } = await supabase.from('reptiles').delete().eq('id', id);

        if (error) {
            console.error("Failed to delete reptile", error);
            setReptiles(previousReptiles); // Revert
        }
    };

    const addLog = async (entry: Omit<LogEntry, "id" | "reptileId"> & { reptileId?: string }) => {
        if (!session) return;
        const newId = crypto.randomUUID();
        const targetReptileId = entry.reptileId || selectedReptileId;
        const newLog = {
            ...entry,
            id: newId,
            reptileId: targetReptileId
        };

        setLogs((prev) => [newLog, ...prev]);

        const { error } = await supabase.from('logs').insert({
            id: newId,
            user_id: session.user.id,
            reptile_id: targetReptileId,
            type: entry.type,
            date: entry.date,
            note: entry.note,
            details: entry.details,
            emoji: entry.emoji,
            weight: entry.weight
        });

        if (error) {
            console.error("Failed to add log", error);
            setLogs(prev => prev.filter(l => l.id !== newId));
        }
    };

    const deleteLog = async (id: string) => {
        if (!session) return;

        setLogs((prev) => prev.filter((l) => l.id !== id));

        const { error } = await supabase.from('logs').delete().eq('id', id);

        if (error) console.error("Failed to delete log", error);
    };

    const addFoodPreset = async (preset: Omit<FoodPreset, "id">) => {
        if (!session) return;
        const newId = crypto.randomUUID();
        const newPreset = { ...preset, id: newId };

        setFoodPresets(prev => [...prev, newPreset]);

        const { error } = await supabase.from('food_presets').insert({
            id: newId,
            user_id: session.user.id,
            name: preset.name,
            emoji: preset.emoji,
            unit: preset.unit
        });

        if (error) console.error("Failed to add preset", error);
    };

    const deleteFoodPreset = async (id: string) => {
        if (!session) return;

        setFoodPresets(prev => prev.filter(p => p.id !== id));

        const { error } = await supabase.from('food_presets').delete().eq('id', id);

        if (error) console.error("Failed to delete preset", error);
    };

    const updateUserProfile = async (profile: Partial<UserProfile>) => {
        if (!session) return;

        const newProfile = userProfile ? { ...userProfile, ...profile } : { name: "", avatar: "👤", bio: "", ...profile };
        setUserProfile(newProfile as UserProfile);

        const updateData: any = {};
        if (profile.name !== undefined) updateData.full_name = profile.name;
        if (profile.avatar !== undefined) updateData.avatar_url = profile.avatar;
        if (profile.bio !== undefined) updateData.bio = profile.bio;

        const { error } = await supabase.from('profiles').update(updateData).eq('id', session.user.id);

        if (error) console.error("Failed to update profile", error);
    };


    // Load/Save Visual Settings (Local Storage)
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
            danger: "#ef4444",
            weight: "#ec4899"
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

    const currentReptile = reptiles.find(r => r.id === selectedReptileId) || (reptiles.length > 0 ? reptiles[0] : null) as any;
    const currentLogs = logs.filter(l => l.reptileId === selectedReptileId);

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
