"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useReptileLogs } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Loader2, Heart, Download, Upload, Palette, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { AlertDialog } from "@/components/alert-dialog";
import { ThemePublishDialog } from "@/components/theme-publish-dialog";
import { ThemeRenameDialog } from "@/components/theme-rename-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Toast } from "@/components/toast";

interface Theme {
    id: string;
    name: string;
    colors: any;
    created_at: string;
    likes_count: number;
    user_id: string;
    isLiked?: boolean;
    author_name?: string;
}

export function ThemeStore() {
    const { t } = useTranslation();
    const { visualSettings, setCustomColors, session } = useReptileLogs();
    const [themes, setThemes] = useState<Theme[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState<"latest" | "popular">("popular");
    const [isPublishing, setIsPublishing] = useState(false);
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; description?: string; type: "success" | "error" | "info" }>({
        isOpen: false,
        title: "",
        type: "info"
    });
    const [toastState, setToastState] = useState<{ isOpen: boolean; message: string }>({
        isOpen: false,
        message: ""
    });
    const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
    const [themeToDelete, setThemeToDelete] = useState<string | null>(null);

    // Auth-dependent processing
    const currentUserId = session?.user?.id;

    const fetchThemes = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('themes')
                .select(`
                    *,
                    profiles:user_id ( full_name, username )
                `)
                .order(sortBy === 'popular' ? 'likes_count' : 'created_at', { ascending: false });

            if (error) throw error;

            let likedThemeIds: string[] = [];
            if (currentUserId) {
                const { data: likes } = await supabase
                    .from('theme_likes')
                    .select('theme_id')
                    .eq('user_id', currentUserId);
                likedThemeIds = likes?.map((l: any) => l.theme_id) || [];
            }

            const formattedThemes = data.map((theme: any) => ({
                ...theme,
                author_name: theme.profiles?.full_name || theme.profiles?.username || "Unknown",
                isLiked: likedThemeIds.includes(theme.id)
            }));

            setThemes(formattedThemes);
        } catch (error) {
            console.error("Error fetching themes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchThemes();
    }, [sortBy, session]);

    const handleApplyTheme = (theme: Theme) => {
        // Apply all colors from the theme at once
        setCustomColors(theme.colors);

        setToastState({
            isOpen: true,
            message: t("settings.theme_applied")
        });
    };

    const handlePublishClick = () => {
        if (!session) {
            setAlertState({
                isOpen: true,
                title: t("community.login_required"),
                type: "error"
            });
            return;
        }
        setShowPublishDialog(true);
    };

    const performPublish = async (name: string) => {
        setIsPublishing(true);
        try {
            const { error } = await supabase.from('themes').insert({
                user_id: session!.user.id,
                name,
                colors: visualSettings.customColors
            });

            if (error) throw error;

            setToastState({
                isOpen: true,
                message: t("settings.theme_published")
            });
            fetchThemes();
        } catch (error) {
            console.error("Error publishing theme:", error);
            setAlertState({
                isOpen: true,
                title: t("settings.theme_publish_failed"),
                type: "error"
            });
        } finally {
            setIsPublishing(false);
        }
    };

    const handleLike = async (themeId: string, isLiked: boolean) => {
        if (!session) {
            setAlertState({
                isOpen: true,
                title: t("community.login_required"),
                type: "error"
            });
            return;
        }

        // Optimistic update
        setThemes(prev => prev.map(t => {
            if (t.id === themeId) {
                return {
                    ...t,
                    isLiked: !isLiked,
                    likes_count: isLiked ? t.likes_count - 1 : t.likes_count + 1
                };
            }
            return t;
        }));

        try {
            if (isLiked) {
                await supabase.from('theme_likes').delete().eq('theme_id', themeId).eq('user_id', session.user.id);
                await supabase.rpc('decrement_theme_likes', { theme_id: themeId });
            } else {
                await supabase.from('theme_likes').insert({ theme_id: themeId, user_id: session.user.id });
                await supabase.rpc('increment_theme_likes', { theme_id: themeId });
            }
        } catch (error) {
            console.error("Like error:", error);
            fetchThemes(); // Revert
        }
    };

    const handleDeleteTheme = async (themeId: string) => {
        try {
            const { error } = await supabase.from('themes').delete().eq('id', themeId);
            if (error) throw error;

            setToastState({
                isOpen: true,
                message: t("settings.theme_deleted")
            });
            fetchThemes();
        } catch (error) {
            console.error("Delete error:", error);
            setAlertState({
                isOpen: true,
                title: "Error",
                description: "Failed to delete theme",
                type: "error"
            });
        }
    };

    const handleRenameTheme = async (newName: string) => {
        if (!editingTheme) return;
        try {
            const { error } = await supabase
                .from('themes')
                .update({ name: newName })
                .eq('id', editingTheme.id);

            if (error) throw error;

            setToastState({
                isOpen: true,
                message: t("common.save_success") || "Saved!"
            });
            fetchThemes();
        } catch (error) {
            console.error("Rename error:", error);
            setToastState({
                isOpen: true,
                message: "Failed to rename theme"
            });
        }
    };

    // Helper to generate example theme (kept for reference but unused in UI)
    const publishExampleTheme = async () => {
        if (!session) return;
        const cherryBlossomColors = {
            background: "#fff0f5", // Lavender Blush
            card: "rgba(255, 255, 255, 0.95)", // Almost solid white
            primary: "#ff8da1", // Slightly stronger pink for better visibility
            secondary: "#ffdde1", // Warm pinkish secondary
            accent: "#98d6aa", // Soft natural green
            text: "#5d4037", // Deep warm brown (instead of gray/black)
            border: "#ffcdd2", // defined pink border
            muted: "#8d6e63", // earth tone for muted text
            feeding: "#ffab91", // Warm coral
            poop: "#a1887f", // Warm brown
            cleaning: "#81d4fa", // Light clean blue
            memo: "#b39ddb", // Soft purple
            success: "#a5d6a7", // Soft green
            danger: "#ef9a9a", // Soft red
            weight: "#ffcc80" // Soft orange
        };

        if (confirm("Register 'Cherry Blossom' theme as example?")) {
            await supabase.from('themes').insert({
                user_id: session.user.id,
                name: "Cherry Blossom 🌸",
                colors: cherryBlossomColors
            });
            fetchThemes();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex gap-2 bg-slate-500/10 p-1 rounded-lg">
                    <button
                        onClick={() => setSortBy("popular")}
                        className={cn(
                            "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                            sortBy === "popular" ? "bg-[var(--background)] text-[var(--foreground)] shadow" : "text-[var(--muted)]"
                        )}
                    >
                        Popular
                    </button>
                    <button
                        onClick={() => setSortBy("latest")}
                        className={cn(
                            "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                            sortBy === "latest" ? "bg-[var(--background)] text-[var(--foreground)] shadow" : "text-[var(--muted)]"
                        )}
                    >
                        Latest
                    </button>
                </div>

                <div className="flex gap-2">
                    {/* Secret dev button for example theme */}
                    {/* <button onClick={publishExampleTheme} className="text-xl hover:scale-110 transition-transform">🌸</button> */}

                    <button
                        onClick={handlePublishClick}
                        disabled={isPublishing}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)] text-white rounded-full text-xs font-bold"
                    >
                        {isPublishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        <span>{t("settings.publish_theme")}</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--muted)]" />
                </div>
            ) : (
                <div className="grid gap-4">
                    {themes.map(theme => (
                        <div key={theme.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-[var(--foreground)]">{theme.name}</h3>
                                    <p className="text-xs text-[var(--muted)]">by {theme.author_name}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="text-[10px] text-[var(--muted)]">
                                        {formatDistanceToNow(new Date(theme.created_at), { addSuffix: true })}
                                    </div>
                                    {session?.user?.id === theme.user_id && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setEditingTheme(theme)}
                                                className="p-1 text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                                                title={t("common.edit")}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setThemeToDelete(theme.id)}
                                                className="p-1 text-[var(--muted)] hover:text-red-500 transition-colors"
                                                title={t("common.delete")}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Preview */}
                            <div
                                className="h-24 rounded-xl relative overflow-hidden border border-white/10 shadow-inner flex items-center justify-center"
                                style={{ backgroundColor: theme.colors.background }}
                            >
                                <div
                                    className="w-32 h-16 rounded-lg shadow-lg flex flex-col p-2 gap-2"
                                    style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }}
                                >
                                    <div className="h-2 w-16 rounded-full" style={{ backgroundColor: theme.colors.primary }}></div>
                                    <div className="flex gap-1">
                                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.colors.feeding }}></div>
                                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.colors.poop }}></div>
                                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.colors.cleaning }}></div>
                                    </div>
                                    <div className="h-2 w-10 mt-auto rounded-full opacity-50" style={{ backgroundColor: theme.colors.text }}></div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => handleLike(theme.id, !!theme.isLiked)}
                                    className="flex items-center gap-1.5 group"
                                >
                                    <Heart className={cn("h-4 w-4 transition-transform group-hover:scale-110", theme.isLiked ? "fill-red-500 text-red-500" : "text-[var(--muted)]")} />
                                    <span className="text-xs font-medium text-[var(--muted)]">{theme.likes_count}</span>
                                </button>

                                <button
                                    onClick={() => handleApplyTheme(theme)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-500/10 hover:bg-slate-500/20 text-[var(--foreground)] rounded-full text-xs font-bold transition-colors"
                                >
                                    <Download className="h-3 w-3" />
                                    <span>{t("settings.apply_theme")}</span>
                                </button>
                            </div>
                        </div>
                    ))
                    }

                    {
                        themes.length === 0 && (
                            <div className="text-center py-10 text-[var(--muted)]">
                                <Palette className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                <p>{t("settings.no_themes")}</p>
                            </div>
                        )
                    }
                </div>
            )}

            <AlertDialog
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                description={alertState.description}
                type={alertState.type}
            />

            {
                showPublishDialog && (
                    <ThemePublishDialog
                        onClose={() => setShowPublishDialog(false)}
                        onPublish={performPublish}
                    />
                )
            }

            {editingTheme && (
                <ThemeRenameDialog
                    initialName={editingTheme.name}
                    onClose={() => setEditingTheme(null)}
                    onRename={handleRenameTheme}
                />
            )}

            <ConfirmDialog
                isOpen={!!themeToDelete}
                onClose={() => setThemeToDelete(null)}
                onConfirm={() => themeToDelete && handleDeleteTheme(themeToDelete)}
                title={t("settings.theme_delete_confirm")}
                variant="danger"
            />

            <Toast
                message={toastState.message}
                isVisible={toastState.isOpen}
                onClose={() => setToastState(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
