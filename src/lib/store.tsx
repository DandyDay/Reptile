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

export type Log = LogEntry;

export interface VisualSettings {
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
    };
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
    visualSettings: VisualSettings;
    setCalViewMode: (mode: "dot" | "emoji") => void;
    setLanguage: (lang: "ko" | "en") => void;
    setTheme: (theme: "dark" | "light" | "custom") => void;
    setCustomColor: (key: string, color: string) => void;
    setCustomColors: (colors: Record<string, string>) => void;
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

const LOCAL_STORAGE_KEY = "reptile-local-data-v1";
const MIGRATION_KEY = "reptile-migration-completed";

interface LocalData {
    reptiles: Reptile[];
    logs: LogEntry[];
    foodPresets: FoodPreset[];
}

function loadLocalData(): LocalData {
    if (typeof window === 'undefined') return { reptiles: [], logs: [], foodPresets: [] };
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load local data", e);
    }
    return { reptiles: [], logs: [], foodPresets: [] };
}

function saveLocalData(data: LocalData) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            console.error("LocalStorage quota exceeded");
        } else {
            console.error("Failed to save local data", e);
        }
    }
}

function clearLocalData() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(LOCAL_STORAGE_KEY);
}

function isMigrationCompleted(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(MIGRATION_KEY) === 'true';
}

function markMigrationCompleted() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MIGRATION_KEY, 'true');
}

export function ReptileProvider({ children }: { children: React.ReactNode }) {
    const [reptiles, setReptiles] = useState<Reptile[]>([]);
    const [selectedReptileId, setSelectedReptileId] = useState<string>("");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [session, setSession] = useState<Session | null>(null);
    const [foodPresets, setFoodPresets] = useState<FoodPreset[]>([]);
    const [hasMigrated, setHasMigrated] = useState(false);

    // Visual settings remain local for now (device preference)
    const [visualSettings, setVisualSettings] = useState({
        calViewMode: "dot" as "dot" | "emoji",
        language: "ko" as "ko" | "en",
        theme: "dark" as "dark" | "light" | "custom",
        customColors: {
            background: "#2d0a1a",
            card: "#3d1222",
            primary: "#ff4d94",
            secondary: "#4d182e",
            accent: "#ff8da1",
            text: "#fff0f5",
            border: "#5d1f36",
            muted: "#a67d8a",
            feeding: "#ff4d94",
            poop: "#a64d79",
            cleaning: "#ff85b3",
            memo: "#e06666",
            success: "#ff4d94",
            danger: "#ff0055",
            weight: "#f06292"
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
            // Handle Logout: Reset to system theme if user logs out
            if (!session && _event === 'SIGNED_OUT') {
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setVisualSettings(prev => ({
                    ...prev,
                    theme: isDark ? 'dark' : 'light'
                }));
                localStorage.removeItem("reptile-visual-settings-v1"); // Optional: clear entirely or just update
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const isMigratingRef = React.useRef(false);

    // 2. Fetch Data from Supabase when session exists, or load local data
    useEffect(() => {
        if (!session) {
            // Load local data for non-logged-in users
            const localData = loadLocalData();
            setReptiles(localData.reptiles);
            setLogs(localData.logs);
            setFoodPresets(localData.foodPresets);
            setUserProfile(null);
            if (localData.reptiles.length > 0) {
                setSelectedReptileId(localData.reptiles[0].id);
            }
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
                    .eq('user_id', session.user.id)
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
                    .eq('user_id', session.user.id)
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
                    .eq('user_id', session.user.id)
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

                    // Load custom theme from server if enabled
                    if ((profileData as any).use_custom_theme && (profileData as any).custom_theme) {
                        setVisualSettings(prev => ({
                            ...prev,
                            theme: "custom",
                            customColors: {
                                ...prev.customColors,
                                ...(profileData as any).custom_theme
                            }
                        }));
                    } else {
                        // If user does NOT use custom theme, revert to system/default
                        // This prevents previous user's custom theme from persisting
                        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        setVisualSettings(prev => ({
                            ...prev,
                            theme: isDark ? 'dark' : 'light'
                        }));
                    }
                }

                // Migrate local data if exists and not already migrated
                if (!hasMigrated && !isMigrationCompleted() && !isMigratingRef.current) {
                    const localData = loadLocalData();
                    if (localData.reptiles.length > 0 || localData.logs.length > 0 || localData.foodPresets.length > 0) {
                        isMigratingRef.current = true;
                        try {
                            const success = await migrateLocalData(localData, session.user.id);
                            if (success) {
                                setHasMigrated(true);
                                markMigrationCompleted();
                            }
                        } finally {
                            isMigratingRef.current = false;
                        }
                    }
                }

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoaded(true);
            }
        };

        fetchData();
    }, [session, hasMigrated]);

    // Migration function: transfer local data to Supabase
    const migrateLocalData = async (localData: LocalData, userId: string): Promise<boolean> => {
        try {
            // Create a mapping of old reptile IDs to new IDs
            const reptileIdMap: Record<string, string> = {};

            // Prepare batch data for reptiles
            const reptilesToInsert = localData.reptiles.map(reptile => {
                const newId = crypto.randomUUID();
                reptileIdMap[reptile.id] = newId;
                return {
                    id: newId,
                    user_id: userId,
                    name: reptile.name,
                    species: reptile.species,
                    photo_url: reptile.avatar,
                    birth_date: reptile.birthday,
                    color: reptile.color,
                    notes: reptile.notes,
                    care_schedules: (reptile.careSchedules || []) as any
                };
            });

            // Batch insert reptiles
            if (reptilesToInsert.length > 0) {
                const { error: reptilesError } = await supabase.from('reptiles').insert(reptilesToInsert as any);
                if (reptilesError) throw reptilesError;
            }

            // Prepare batch data for logs
            const logsToInsert = localData.logs
                .filter(log => reptileIdMap[log.reptileId])
                .map(log => ({
                    id: crypto.randomUUID(),
                    user_id: userId,
                    reptile_id: reptileIdMap[log.reptileId],
                    type: log.type,
                    date: log.date,
                    note: log.note,
                    details: log.details,
                    emoji: log.emoji,
                    weight: log.weight
                }));

            // Batch insert logs
            if (logsToInsert.length > 0) {
                const { error: logsError } = await supabase.from('logs').insert(logsToInsert);
                if (logsError) throw logsError;
            }

            // Prepare batch data for food presets
            const presetsToInsert = localData.foodPresets.map(preset => ({
                id: crypto.randomUUID(),
                user_id: userId,
                name: preset.name,
                emoji: preset.emoji,
                unit: preset.unit
            }));

            // Batch insert presets
            if (presetsToInsert.length > 0) {
                const { error: presetsError } = await supabase.from('food_presets').insert(presetsToInsert);
                if (presetsError) throw presetsError;
            }

            // Only clear local data after ALL operations succeed
            clearLocalData();

            // Refetch data to get the migrated items
            const { data: reptilesData } = await supabase
                .from('reptiles')
                .select('*')
                .eq('user_id', userId)
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

            const { data: logsData } = await supabase
                .from('logs')
                .select('*')
                .eq('user_id', userId)
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

            const { data: presetsData } = await supabase
                .from('food_presets')
                .select('*')
                .eq('user_id', userId)
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

            console.log("Local data migrated successfully!");
            return true;
        } catch (error) {
            console.error("Failed to migrate local data:", error);
            // Don't clear local data on failure - preserve user's data
            return false;
        }
    };

    // Data Mutations

    const addReptile = async (reptile: Omit<Reptile, "id">) => {
        const newId = crypto.randomUUID();
        const newReptile = { ...reptile, id: newId };

        // Optimistic update
        setReptiles(prev => {
            const updated = [...prev, newReptile];
            if (!session) {
                // Save to local storage
                const localData = loadLocalData();
                saveLocalData({ ...localData, reptiles: updated });
            }
            return updated;
        });
        setSelectedReptileId(newId);

        if (!session) return; // Local storage already updated above

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
        const previousReptiles = reptiles;

        // Optimistic
        setReptiles(prev => {
            const updated = prev.map(r => r.id === id ? { ...r, ...updatedFields } : r);
            if (!session) {
                const localData = loadLocalData();
                saveLocalData({ ...localData, reptiles: updated });
            }
            return updated;
        });

        if (!session) return;

        const updateData: any = {};
        if (updatedFields.name !== undefined) updateData.name = updatedFields.name;
        if (updatedFields.species !== undefined) updateData.species = updatedFields.species;
        if (updatedFields.avatar !== undefined) updateData.photo_url = updatedFields.avatar;
        if (updatedFields.birthday !== undefined) updateData.birth_date = updatedFields.birthday;
        if (updatedFields.color !== undefined) updateData.color = updatedFields.color;
        if (updatedFields.notes !== undefined) updateData.notes = updatedFields.notes;
        if (updatedFields.careSchedules !== undefined) updateData.care_schedules = updatedFields.careSchedules;

        const { error } = await supabase.from('reptiles').update(updateData).eq('id', id);

        if (error) {
            console.error("Failed to update reptile", error);
            setReptiles(previousReptiles); // Revert
        }
    };

    const deleteReptile = async (id: string) => {
        // Optimistic
        const previousReptiles = reptiles;
        const updatedReptiles = reptiles.filter(r => r.id !== id);
        const updatedLogs = logs.filter(l => l.reptileId !== id);

        setReptiles(updatedReptiles);
        setLogs(updatedLogs);

        if (!session) {
            const localData = loadLocalData();
            saveLocalData({ ...localData, reptiles: updatedReptiles, logs: updatedLogs });
        }

        if (selectedReptileId === id && updatedReptiles.length > 0) {
            setSelectedReptileId(updatedReptiles[0].id);
        } else if (updatedReptiles.length === 0) {
            setSelectedReptileId("");
        }

        if (!session) return;

        const { error } = await supabase.from('reptiles').delete().eq('id', id);

        if (error) {
            console.error("Failed to delete reptile", error);
            setReptiles(previousReptiles); // Revert
        }
    };

    const addLog = async (entry: Omit<LogEntry, "id" | "reptileId"> & { reptileId?: string }) => {
        const newId = crypto.randomUUID();
        const targetReptileId = entry.reptileId || selectedReptileId;
        const newLog = {
            ...entry,
            id: newId,
            reptileId: targetReptileId
        };

        setLogs((prev) => {
            const updated = [newLog, ...prev];
            if (!session) {
                const localData = loadLocalData();
                saveLocalData({ ...localData, logs: updated });
            }
            return updated;
        });

        if (!session) return;

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
        const previousLogs = logs;

        setLogs((prev) => {
            const updated = prev.filter((l) => l.id !== id);
            if (!session) {
                const localData = loadLocalData();
                saveLocalData({ ...localData, logs: updated });
            }
            return updated;
        });

        if (!session) return;

        const { error } = await supabase.from('logs').delete().eq('id', id);

        if (error) {
            console.error("Failed to delete log", error);
            setLogs(previousLogs); // Revert
        }
    };

    const addFoodPreset = async (preset: Omit<FoodPreset, "id">) => {
        const newId = crypto.randomUUID();
        const newPreset = { ...preset, id: newId };

        setFoodPresets(prev => {
            const updated = [...prev, newPreset];
            if (!session) {
                const localData = loadLocalData();
                saveLocalData({ ...localData, foodPresets: updated });
            }
            return updated;
        });

        if (!session) return;

        const { error } = await supabase.from('food_presets').insert({
            id: newId,
            user_id: session.user.id,
            name: preset.name,
            emoji: preset.emoji,
            unit: preset.unit
        });

        if (error) {
            console.error("Failed to add preset", error);
            setFoodPresets(prev => prev.filter(p => p.id !== newId)); // Revert
        }
    };

    const deleteFoodPreset = async (id: string) => {
        const previousPresets = foodPresets;

        setFoodPresets(prev => {
            const updated = prev.filter(p => p.id !== id);
            if (!session) {
                const localData = loadLocalData();
                saveLocalData({ ...localData, foodPresets: updated });
            }
            return updated;
        });

        if (!session) return;

        const { error } = await supabase.from('food_presets').delete().eq('id', id);

        if (error) {
            console.error("Failed to delete preset", error);
            setFoodPresets(previousPresets); // Revert
        }
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

    // System theme detection - follow device preference for dark/light mode
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
            const systemTheme = e.matches ? 'dark' : 'light';
            setVisualSettings(prev => {
                // Don't override if user has custom theme
                if (prev.theme === 'custom') return prev;
                return { ...prev, theme: systemTheme };
            });
        };

        // Note: We removed the immediate call `handleThemeChange(mediaQuery)`
        // because it would overwrite any manual setting loaded from localStorage
        // or set by the user if the system preference differs.
        // We only listen for *changes* in system preference now.

        // Listen for changes
        mediaQuery.addEventListener('change', handleThemeChange);

        return () => {
            mediaQuery.removeEventListener('change', handleThemeChange);
        };
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

        // Update server if logged in
        if (session?.user) {
            // If switching away from custom theme, disable it on server
            if (theme !== 'custom') {
                supabase.from('profiles').update({
                    use_custom_theme: false
                } as any).eq('id', session.user.id).then();
            }
        }
    };

    const setCustomColor = (key: string, color: string) => {
        setVisualSettings(prev => {
            const newSettings = {
                ...prev,
                theme: "custom" as const,
                customColors: {
                    ...prev.customColors,
                    [key]: color
                }
            };
            localStorage.setItem("reptile-visual-settings-v1", JSON.stringify(newSettings));

            // Save to server if logged in
            if (session?.user) {
                supabase.from('profiles').update({
                    use_custom_theme: true,
                    custom_theme: newSettings.customColors
                } as any).eq('id', session.user.id).then();
            }

            return newSettings;
        });
    };

    const setCustomColors = (colors: Record<string, string>) => {
        setVisualSettings(prev => {
            const newSettings = {
                ...prev,
                theme: "custom" as const,
                customColors: {
                    ...prev.customColors,
                    ...colors
                }
            };
            localStorage.setItem("reptile-visual-settings-v1", JSON.stringify(newSettings));

            // Save to server if logged in
            if (session?.user) {
                supabase.from('profiles').update({
                    use_custom_theme: true,
                    custom_theme: newSettings.customColors
                } as any).eq('id', session.user.id).then();
            }

            return newSettings;
        });
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
        root.style.setProperty('--primary-half', colors.primary + '80');
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
        setCustomColors,
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
