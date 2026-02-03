"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useReptileLogs } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ArrowLeft, Trash2, Upload, Download, X, Settings2,
    Palette, ChevronRight, Database, UserPlus, Users, Languages, LogOut, User, Loader2, Camera, Store
} from "lucide-react";
import { ThemeStore } from "@/components/theme-store";
import { ThemePublishDialog } from "@/components/theme-publish-dialog";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { FeedingPresetManager } from "@/components/feeding-preset-manager";
import { motion, AnimatePresence } from "framer-motion";
import { ImageCropper } from "@/components/image-cropper";
import { AuthDialog } from "@/components/auth-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { supabase } from "@/lib/supabase";
import { Toast } from "@/components/toast";

type SettingsView = "main" | "reptiles" | "add_reptile" | "edit_reptile" | "appearance" | "data" | "profile" | "theme_store";

function SettingsContent() {
    const {
        reptiles, addReptile, updateReptile, deleteReptile, visualSettings,
        setCalViewMode, setLanguage, setTheme, setCustomColor,
        session
    } = useReptileLogs();

    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [view, setView] = useState<SettingsView>("main");

    // Form settings
    const [name, setName] = useState("");
    const [species, setSpecies] = useState("");
    const [avatar, setAvatar] = useState("🦎");
    const [isEmojiMode, setIsEmojiMode] = useState(true);
    const [birthday, setBirthday] = useState("");
    const [notes, setNotes] = useState("");
    const [editingReptileId, setEditingReptileId] = useState<string | null>(null);
    const [rawImage, setRawImage] = useState<string | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [showAuthDialog, setShowAuthDialog] = useState(false);
    const [showThemePublishDialog, setShowThemePublishDialog] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string } | null>(null);
    const [showCustomColors, setShowCustomColors] = useState(false);

    // Profile edit state
    const [myProfile, setMyProfile] = useState<any>(null);
    const [profileName, setProfileName] = useState("");
    const [profileBio, setProfileBio] = useState("");
    const [profileAvatar, setProfileAvatar] = useState("");
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const profileFileInputRef = useRef<HTMLInputElement>(null);
    const [profileRawImage, setProfileRawImage] = useState<string | null>(null);
    const [isProfileCropping, setIsProfileCropping] = useState(false);
    const [toastState, setToastState] = useState<{ isOpen: boolean; message: string }>({
        isOpen: false,
        message: ""
    });

    // Care Schedule state
    const [feedingEnabled, setFeedingEnabled] = useState(false);
    const [feedingMode, setFeedingMode] = useState<"interval" | "weekly">("interval");
    const [feedingDays, setFeedingDays] = useState(2);
    const [feedingSpecificDays, setFeedingSpecificDays] = useState<number[]>([]);

    const [cleaningEnabled, setCleaningEnabled] = useState(false);
    const [cleaningMode, setCleaningMode] = useState<"interval" | "weekly">("interval");
    const [cleaningDays, setCleaningDays] = useState(7);
    const [cleaningSpecificDays, setCleaningSpecificDays] = useState<number[]>([]);

    const resetForm = () => {
        setName("");
        setSpecies("");
        setAvatar("🦎");
        setBirthday("");
        setNotes("");
        setEditingReptileId(null);
        setFeedingEnabled(false);
        setFeedingMode("interval");
        setFeedingDays(2);
        setFeedingSpecificDays([]);
        setCleaningEnabled(false);
        setCleaningMode("interval");
        setCleaningDays(7);
        setCleaningSpecificDays([]);
    };

    const handleEditClick = (id: string) => {
        const r = reptiles.find(x => x.id === id);
        if (r) {
            setName(r.name);
            setSpecies(r.species);
            setAvatar(r.avatar);
            setIsEmojiMode(!r.avatar.startsWith('data:') && !r.avatar.startsWith('http'));
            setBirthday(r.birthday || "");
            setNotes(r.notes || "");

            // Load schedules
            const feeding = r.careSchedules?.find(s => s.type === 'feeding');
            setFeedingEnabled(!!feeding?.enabled);
            setFeedingMode(feeding?.scheduleMode || "interval");
            setFeedingDays(feeding?.frequencyDays || 2);
            setFeedingSpecificDays(feeding?.specificDays || []);

            const cleaning = r.careSchedules?.find(s => s.type === 'cleaning');
            setCleaningEnabled(!!cleaning?.enabled);
            setCleaningMode(cleaning?.scheduleMode || "interval");
            setCleaningDays(cleaning?.frequencyDays || 7);
            setCleaningSpecificDays(cleaning?.specificDays || []);

            setEditingReptileId(id);
            setView("edit_reptile");
        }
    };

    // Read view from URL on mount
    useEffect(() => {
        const v = searchParams.get("view") as SettingsView;
        if (v) setView(v);
    }, [searchParams]);

    // Fetch user profile
    useEffect(() => {
        if (session?.user) {
            setIsProfileLoading(true);
            supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setMyProfile(data);
                        setProfileName(data.full_name || "");
                        setProfileBio(data.bio || "");
                        setProfileAvatar(data.avatar_url || "");
                    }
                    setIsProfileLoading(false);
                });
        }
    }, [session]);

    const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("이미지가 너무 큽니다 (최대 5MB)");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileRawImage(reader.result as string);
                setIsProfileCropping(true);
            };
            reader.readAsDataURL(file);
            e.target.value = "";
        }
    };

    const handleSaveProfile = async () => {
        if (!session?.user) return;

        setIsSavingProfile(true);
        try {
            let avatarUrl = profileAvatar;

            // Upload new avatar if it's a data URL
            if (profileAvatar.startsWith('data:')) {
                const blob = await fetch(profileAvatar).then(r => r.blob());
                const fileName = `${session.user.id}/${Date.now()}.jpg`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, blob, { upsert: true });

                if (!uploadError) {
                    const { data: urlData } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(fileName);
                    avatarUrl = urlData.publicUrl;
                }
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: profileName,
                    bio: profileBio,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', session.user.id);

            if (!error) {
                setMyProfile({ ...myProfile, full_name: profileName, bio: profileBio, avatar_url: avatarUrl });
                setProfileAvatar(avatarUrl);
                setView("main");
            } else {
                alert("프로필 저장 실패: " + error.message);
            }
        } catch (err) {
            console.error('Error saving profile:', err);
            alert("프로필 저장 중 오류가 발생했습니다.");
        }
        setIsSavingProfile(false);
    };

    // Constants
    const avatars = ["🦎", "🐍", "🐢", "🐸", "🐊", "🦖", "🥚", "🐲"];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const careSchedules = [
            {
                type: 'feeding' as const,
                scheduleMode: feedingMode,
                frequencyDays: feedingMode === 'interval' ? feedingDays : undefined,
                specificDays: feedingMode === 'weekly' ? feedingSpecificDays : undefined,
                enabled: feedingEnabled
            },
            {
                type: 'cleaning' as const,
                scheduleMode: cleaningMode,
                frequencyDays: cleaningMode === 'interval' ? cleaningDays : undefined,
                specificDays: cleaningMode === 'weekly' ? cleaningSpecificDays : undefined,
                enabled: cleaningEnabled
            }
        ];

        if (view === "edit_reptile" && editingReptileId) {
            updateReptile(editingReptileId, {
                name,
                species,
                avatar,
                birthday: birthday || undefined,
                notes: notes || undefined,
                careSchedules
            });
        } else {
            addReptile({
                name,
                species,
                color: "emerald",
                avatar,
                birthday: birthday || undefined,
                notes: notes || undefined,
                careSchedules
            });
        }

        resetForm();
        resetForm();
        setView("reptiles");
    };

    const handlePublishTheme = () => {
        if (!session?.user) {
            setShowAuthDialog(true);
            return;
        }
        setShowThemePublishDialog(true);
    };

    const performThemePublish = async (name: string) => {
        if (!session?.user) return;

        const { error } = await supabase
            .from('themes')
            .insert({
                user_id: session.user.id,
                name,
                colors: visualSettings.customColors,
                likes_count: 0
            });

        if (error) throw error;
        setToastState({
            isOpen: true,
            message: t("settings.theme_published")
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit now that we crop
                alert("Image too large (max 5MB)");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setRawImage(reader.result as string);
                setIsCropping(true);
            };
            reader.readAsDataURL(file);
            // Reset input so the same file can be picked again
            e.target.value = "";
        }
    };

    const renderHeader = () => {
        const title = view === "main" ? t("settings.title") :
            view === "reptiles" ? t("settings.sections.reptiles") :
                view === "add_reptile" ? t("settings.add_profile") :
                    view === "edit_reptile" ? t("settings.edit_profile") :
                        view === "appearance" ? t("settings.sections.appearance") :
                            view === "profile" ? "프로필 편집" :
                                view === "theme_store" ? t("settings.theme_store") :
                                    t("settings.sections.data");

        const backTarget = view === "main" ? "/" : () => setView(view === "theme_store" ? "appearance" : (view === "add_reptile" || view === "edit_reptile" ? "reptiles" : "main"));

        return (
            <div className="flex items-center gap-4 mb-8">
                {typeof backTarget === "string" ? (
                    <Link href={backTarget} className="rounded-full bg-[var(--card)] p-2 text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                ) : (
                    <button onClick={backTarget} className="rounded-full bg-[var(--card)] p-2 text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                )}
                <h1 className="text-xl font-bold text-[var(--foreground)]">{title}</h1>
            </div>
        );
    };

    const renderMainView = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Profile Card */}
            {session && (
                <Card
                    className="p-4 border-[var(--border)] hover:border-[var(--primary)] transition-all cursor-pointer group"
                    onClick={() => setView("profile")}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-slate-500/10 flex items-center justify-center overflow-hidden border-2 border-[var(--border)] group-hover:border-[var(--primary)] transition-colors">
                                {profileAvatar ? (
                                    <img src={profileAvatar} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-7 w-7 text-[var(--muted)]" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--foreground)]">
                                    {profileName || session.user.email?.split('@')[0] || "내 프로필"}
                                </h3>
                                <p className="text-xs text-[var(--muted)]">
                                    {profileBio || "프로필을 설정해주세요"}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
                    </div>
                </Card>
            )}

            <div className="grid gap-4">
                <Card
                    className="p-4 border-[var(--border)] hover:border-[var(--primary)] transition-all cursor-pointer group"
                    onClick={() => setView("reptiles")}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-slate-500/10 text-[var(--primary)] group-hover:scale-110 transition-transform">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--foreground)]">{t("settings.sections.reptiles")}</h3>
                                <p className="text-xs text-[var(--muted)]">{reptiles.length} {t("settings.your_reptiles")}</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
                    </div>
                </Card>

                <Card
                    className="p-4 border-[var(--border)] hover:border-[var(--primary)] transition-all cursor-pointer group"
                    onClick={() => setView("appearance")}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-slate-500/10 text-pink-400 group-hover:scale-110 transition-transform">
                                <Palette className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--foreground)]">{t("settings.sections.appearance")}</h3>
                                <p className="text-xs text-[var(--muted)]">{t("settings.theme")}, {t("settings.language")}</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
                    </div>
                </Card>

                <Card
                    className="p-4 border-[var(--border)] hover:border-[var(--primary)] transition-all cursor-pointer group"
                    onClick={() => setView("data")}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-slate-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                                <Database className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--foreground)]">{t("settings.sections.data")}</h3>
                                <p className="text-xs text-[var(--muted)]">{t("calendar.manage_presets")}</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
                    </div>
                </Card>
            </div>

            {session ? (
                <button
                    onClick={async () => {
                        await supabase.auth.signOut();
                    }}
                    className="w-full p-4 rounded-xl flex items-center justify-center gap-2 text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold text-sm"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out ({session.user.email})
                </button>
            ) : (
                <button
                    onClick={() => setShowAuthDialog(true)}
                    className="w-full p-4 rounded-xl flex items-center justify-center gap-2 text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 transition-all font-bold text-sm"
                >
                    <UserPlus className="h-4 w-4" />
                    Sign In / Sign Up
                </button>
            )}
        </div>
    );

    const renderReptilesView = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">{t("settings.your_reptiles")}</h2>
                <Button size="sm" onClick={() => {
                    if (!session) {
                        setShowAuthDialog(true);
                        return;
                    }
                    resetForm();
                    setView("add_reptile");
                }} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    {t("common.add")}
                </Button>
            </div>

            <div className="grid gap-3">
                {reptiles.map(r => (
                    <div
                        key={r.id}
                        onClick={() => handleEditClick(r.id)}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-500/10 border border-[var(--border)] group hover:border-[var(--primary)]/30 transition-all cursor-pointer relative"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-500/20 flex items-center justify-center border border-[var(--border)] shrink-0">
                                {r.avatar.startsWith('data:') || r.avatar.startsWith('http') ? (
                                    <img src={r.avatar} alt={r.name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-2xl">{r.avatar}</span>
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold text-[var(--foreground)] truncate">{r.name}</p>
                                <p className="text-xs text-[var(--muted)] truncate">{r.species}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {reptiles.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteTarget({ id: r.id, name: r.name });
                                        setShowConfirmDelete(true);
                                    }}
                                    className="p-2.5 text-red-400/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all md:opacity-0 md:group-hover:opacity-100"
                                    title={t("common.delete")}
                                >
                                    <Trash2 className="h-4.5 w-4.5" />
                                </button>
                            )}
                            <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderFormView = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <Card className="p-6 border-[var(--primary)]/20 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Avatar Picker */}
                    <div className="flex flex-col items-center gap-4 pb-4 border-b border-[var(--border)]">
                        <div className="relative h-24 w-24 rounded-full bg-slate-500/10 ring-4 ring-[var(--border)] flex items-center justify-center overflow-hidden">
                            {avatar.startsWith("data:") || avatar.startsWith("http") ? (
                                <img src={avatar} alt="Preview" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-4xl">{avatar}</span>
                            )}
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Upload className="h-6 w-6 text-white" />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" size="sm" variant={isEmojiMode ? "primary" : "secondary"} onClick={() => setIsEmojiMode(true)} className="text-xs h-8 px-3">
                                {t("common.emoji")}
                            </Button>
                            <Button type="button" size="sm" variant={!isEmojiMode ? "primary" : "secondary"} onClick={() => fileInputRef.current?.click()} className="text-xs h-8 px-3">
                                {t("common.photo")}
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        {isEmojiMode && (
                            <div className="flex gap-2 flex-wrap justify-center max-w-xs">
                                {avatars.map(a => (
                                    <button
                                        key={a}
                                        type="button"
                                        onClick={() => { setAvatar(a); setIsEmojiMode(true); }}
                                        className={cn(
                                            "flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all",
                                            avatar === a ? "bg-[var(--primary)] text-white scale-110 shadow-lg" : "bg-slate-500/10 text-[var(--muted)] hover:bg-slate-500/20 border border-[var(--border)]"
                                        )}
                                    >
                                        {a}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--muted)]">{t("settings.name")}</label>
                            <input
                                className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] p-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                placeholder={t("settings.name_placeholder")}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--muted)]">{t("settings.species")}</label>
                            <input
                                className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] p-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                placeholder={t("settings.species_placeholder")}
                                value={species}
                                onChange={e => setSpecies(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--muted)]">{t("settings.birthday")}</label>
                            <input
                                type="date"
                                className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] p-3 text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] color-scheme-normal"
                                style={{ colorScheme: visualSettings?.theme === 'light' ? 'light' : 'dark' }}
                                value={birthday}
                                onChange={e => setBirthday(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--muted)]">{t("settings.profile_notes")}</label>
                            <textarea
                                className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] p-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] min-h-[80px]"
                                placeholder={t("settings.profile_notes_placeholder")}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        {/* Care Schedule Section */}
                        <div className="pt-4 border-t border-[var(--border)]">
                            <h3 className="text-sm font-bold text-[var(--foreground)] mb-4">{t("settings.care_schedule")}</h3>

                            <div className="space-y-4">
                                {/* Feeding Schedule */}
                                <div className="p-4 rounded-2xl bg-slate-500/5 border border-[var(--border)] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">
                                                🥗
                                            </div>
                                            <span className="text-sm font-bold text-[var(--foreground)]">{t("settings.feeding_cycle")}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFeedingEnabled(!feedingEnabled)}
                                            className={cn(
                                                "w-12 h-6 rounded-full transition-colors relative",
                                                feedingEnabled ? "bg-[var(--primary)]" : "bg-slate-500/20"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                                feedingEnabled ? "left-7" : "left-1"
                                            )} />
                                        </button>
                                    </div>

                                    {feedingEnabled && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {/* Mode Switch */}
                                            <div className="flex gap-1 bg-slate-500/10 p-1 rounded-xl">
                                                {(['interval', 'weekly'] as const).map(m => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setFeedingMode(m)}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                            feedingMode === m ? "bg-[var(--background)] text-[var(--primary)] shadow-sm" : "text-[var(--muted)]"
                                                        )}
                                                    >
                                                        {t(`settings.schedule_mode_${m}` as any)}
                                                    </button>
                                                ))}
                                            </div>

                                            {feedingMode === 'interval' ? (
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="7"
                                                        value={feedingDays}
                                                        onChange={(e) => setFeedingDays(parseInt(e.target.value))}
                                                        className="flex-1 accent-[var(--primary)]"
                                                    />
                                                    <span className="text-xs font-black text-[var(--primary)] min-w-[60px] text-right">
                                                        {t("settings.every_days").replace('{{days}}', feedingDays.toString())}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest px-1">{t("settings.select_days_desc")}</p>
                                                    <div className="flex justify-between">
                                                        {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day, i) => (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFeedingSpecificDays(prev =>
                                                                        prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
                                                                    );
                                                                }}
                                                                className={cn(
                                                                    "h-9 w-9 rounded-xl flex items-center justify-center text-[10px] font-black transition-all border",
                                                                    feedingSpecificDays.includes(i)
                                                                        ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg shadow-[var(--primary)]/20 scale-110"
                                                                        : "bg-[var(--background)] text-[var(--muted)] border-[var(--border)]"
                                                                )}
                                                            >
                                                                {t(`calendar.days.${day}` as any)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Cleaning Schedule */}
                                <div className="p-4 rounded-2xl bg-slate-500/5 border border-[var(--border)] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 font-bold">
                                                ✨
                                            </div>
                                            <span className="text-sm font-bold text-[var(--foreground)]">{t("settings.cleaning_cycle")}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCleaningEnabled(!cleaningEnabled)}
                                            className={cn(
                                                "w-12 h-6 rounded-full transition-colors relative",
                                                cleaningEnabled ? "bg-[var(--primary)]" : "bg-slate-500/20"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                                cleaningEnabled ? "left-7" : "left-1"
                                            )} />
                                        </button>
                                    </div>

                                    {cleaningEnabled && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {/* Mode Switch */}
                                            <div className="flex gap-1 bg-slate-500/10 p-1 rounded-xl">
                                                {(['interval', 'weekly'] as const).map(m => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setCleaningMode(m)}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                            cleaningMode === m ? "bg-[var(--background)] text-[var(--primary)] shadow-sm" : "text-[var(--muted)]"
                                                        )}
                                                    >
                                                        {t(`settings.schedule_mode_${m}` as any)}
                                                    </button>
                                                ))}
                                            </div>

                                            {cleaningMode === 'interval' ? (
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="7"
                                                        value={cleaningDays}
                                                        onChange={(e) => setCleaningDays(parseInt(e.target.value))}
                                                        className="flex-1 accent-[var(--primary)]"
                                                    />
                                                    <span className="text-xs font-black text-[var(--primary)] min-w-[60px] text-right">
                                                        {t("settings.every_days").replace('{{days}}', cleaningDays.toString())}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest px-1">{t("settings.select_days_desc")}</p>
                                                    <div className="flex justify-between">
                                                        {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day, i) => (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => {
                                                                    setCleaningSpecificDays(prev =>
                                                                        prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
                                                                    );
                                                                }}
                                                                className={cn(
                                                                    "h-9 w-9 rounded-xl flex items-center justify-center text-[10px] font-black transition-all border",
                                                                    cleaningSpecificDays.includes(i)
                                                                        ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg shadow-[var(--primary)]/20 scale-110"
                                                                        : "bg-[var(--background)] text-[var(--muted)] border-[var(--border)]"
                                                                )}
                                                            >
                                                                {t(`calendar.days.${day}` as any)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                            <Button type="button" variant="secondary" className="flex-1" onClick={() => setView("reptiles")}>
                                {t("common.cancel")}
                            </Button>
                            <Button className="flex-2" type="submit">
                                {view === "edit_reptile" ? t("common.save") : t("settings.create_profile")}
                            </Button>
                        </div>

                        {view === "edit_reptile" && reptiles.length > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full text-red-500 hover:bg-red-500/10 h-10 mt-2 text-xs"
                                onClick={() => {
                                    if (editingReptileId) {
                                        setDeleteTarget({ id: editingReptileId, name: name });
                                        setShowConfirmDelete(true);
                                    }
                                }}
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                {t("common.delete")}
                            </Button>
                        )}
                    </div>
                </form>
            </Card>
        </div>
    );

    const renderAppearanceView = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <Card className="p-4 border-[var(--border)] divide-y divide-[var(--border)]">
                <div className="space-y-2 pb-6">
                    {/* Theme Selector */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <Palette className="h-5 w-5 text-pink-400" />
                            <h3 className="font-semibold text-[var(--foreground)]">{t("settings.theme")}</h3>
                        </div>

                        <div className="flex gap-1 bg-slate-500/10 p-1 rounded-lg border border-[var(--border)]">
                            {(['dark', 'light', 'custom'] as const).map((tId) => (
                                <button
                                    key={tId}
                                    onClick={() => setTheme(tId)}
                                    className={cn(
                                        "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                        visualSettings?.theme === tId ? "bg-[var(--primary)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                                    )}
                                >
                                    {t(`settings.${tId}` as any)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Theme Store Link */}
                    <button
                        onClick={() => setView("theme_store")}
                        className="w-full p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-[var(--border)] flex items-center justify-between group hover:border-pink-500/30 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                                <Store className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-[var(--foreground)]">{t("settings.theme_store")}</h3>
                                <p className="text-xs text-[var(--muted)]">Find and share custom themes</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors" />
                    </button>
                </div>

                {/* Custom Theme Editor */}
                {visualSettings?.theme === 'custom' && (
                    <div className="py-6 space-y-6">


                        <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={handlePublishTheme} className="flex-1 gap-2">
                                <Store className="h-4 w-4" />
                                {t("settings.publish_theme")}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => setShowCustomColors(!showCustomColors)} className="flex-1 gap-2 border border-[var(--border)]">
                                <Palette className="h-4 w-4" />
                                {showCustomColors ? t("settings.hide_colors") : t("settings.edit_colors")}
                                <ChevronRight className={cn("h-4 w-4 transition-transform", showCustomColors && "rotate-90")} />
                            </Button>
                        </div>

                        {showCustomColors && (
                            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                                {Object.entries(visualSettings.customColors).map(([key, value]) => (
                                    <div key={key} className="space-y-1.5 p-2 rounded-lg bg-slate-500/5 border border-[var(--border)] transition-colors hover:border-[var(--primary)]/30">
                                        <label className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider block truncate">{t(`settings.colors.${key}` as any)}</label>
                                        <div className="flex items-center gap-2">
                                            <div className="relative h-7 w-10 rounded border border-[var(--border)] overflow-hidden">
                                                <input
                                                    type="color"
                                                    value={value}
                                                    onChange={(e) => setCustomColor(key, e.target.value)}
                                                    className="absolute -inset-1 h-10 w-14 cursor-pointer"
                                                />
                                            </div>
                                            <span className="text-[9px] font-mono text-[var(--muted)]">{value.toUpperCase()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Language Selector */}
                <div className="py-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Languages className="h-5 w-5 text-blue-400" />
                        <h3 className="font-semibold text-[var(--foreground)]">{t("settings.language")}</h3>
                    </div>
                    <div className="flex gap-1 bg-slate-500/10 p-1 rounded-lg border border-[var(--border)]">
                        <button
                            onClick={() => setLanguage('ko')}
                            className={cn(
                                "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                visualSettings?.language === 'ko' ? "bg-[var(--primary)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            )}
                        >
                            한국어
                        </button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={cn(
                                "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                visualSettings?.language === 'en' ? "bg-[var(--primary)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            )}
                        >
                            English
                        </button>
                    </div>
                </div>

                {/* Calendar View Mode */}
                <div className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Settings2 className="h-5 w-5 text-amber-400" />
                        <h3 className="font-semibold text-[var(--foreground)]">{t("settings.calendar_view")}</h3>
                    </div>
                    <div className="flex gap-1 bg-slate-500/10 p-1 rounded-lg border border-[var(--border)]">
                        <button
                            onClick={() => setCalViewMode('dot')}
                            className={cn(
                                "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                visualSettings?.calViewMode === 'dot' ? "bg-[var(--primary)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            )}
                        >
                            {t("settings.view_dots")}
                        </button>
                        <button
                            onClick={() => setCalViewMode('emoji')}
                            className={cn(
                                "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                visualSettings?.calViewMode === 'emoji' ? "bg-[var(--primary)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            )}
                        >
                            {t("settings.view_emojis")}
                        </button>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mt-2 italic">{t("settings.calendar_view_desc")}</p>
                </div>
            </Card>
        </div>
    );

    const renderDataView = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <FeedingPresetManager />
        </div>
    );

    const renderProfileView = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <Card className="p-6 border-[var(--primary)]/20 shadow-sm">
                {isProfileLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Avatar Picker */}
                        <div className="flex flex-col items-center gap-4 pb-4 border-b border-[var(--border)]">
                            <div className="relative h-24 w-24 rounded-full bg-slate-500/10 ring-4 ring-[var(--border)] flex items-center justify-center overflow-hidden">
                                {profileAvatar ? (
                                    <img src={profileAvatar} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-12 w-12 text-[var(--muted)]" />
                                )}
                                <button
                                    type="button"
                                    onClick={() => profileFileInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                                >
                                    <Camera className="h-6 w-6 text-white" />
                                </button>
                            </div>
                            <button
                                onClick={() => profileFileInputRef.current?.click()}
                                className="text-sm text-[var(--primary)] hover:underline"
                            >
                                프로필 사진 변경
                            </button>
                            <input
                                type="file"
                                ref={profileFileInputRef}
                                accept="image/*"
                                className="hidden"
                                onChange={handleProfileImageChange}
                            />
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[var(--muted)]">이름</label>
                                <input
                                    className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] p-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                    placeholder="이름을 입력하세요"
                                    value={profileName}
                                    onChange={e => setProfileName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[var(--muted)]">자기소개</label>
                                <textarea
                                    className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] p-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] min-h-[100px]"
                                    placeholder="자기소개를 입력하세요"
                                    value={profileBio}
                                    onChange={e => setProfileBio(e.target.value)}
                                />
                            </div>

                            {session && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[var(--muted)]">이메일</label>
                                    <input
                                        className="w-full rounded-xl bg-slate-500/5 border border-[var(--border)] p-3 text-[var(--muted)] cursor-not-allowed"
                                        value={session.user.email}
                                        disabled
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                className="w-full"
                                onClick={handleSaveProfile}
                                disabled={isSavingProfile}
                            >
                                {isSavingProfile ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        저장 중...
                                    </>
                                ) : (
                                    "저장"
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );

    return (
        <main className="min-h-screen bg-[var(--background)] p-4 text-[var(--foreground)] md:p-8 pb-32">
            <div className="mx-auto max-w-2xl space-y-8">
                {renderHeader()}

                <div className="min-h-[400px]">
                    {view === "main" && renderMainView()}
                    {view === "reptiles" && renderReptilesView()}
                    {view === "add_reptile" && renderFormView()}
                    {view === "edit_reptile" && renderFormView()}
                    {view === "appearance" && renderAppearanceView()}
                    {view === "data" && renderDataView()}
                    {view === "profile" && renderProfileView()}
                    {view === "theme_store" && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <ThemeStore />
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {!!showAuthDialog && (
                    <div key="auth-dialog" className="fixed inset-0 z-[100]">
                        <AuthDialog onClose={() => setShowAuthDialog(false)} />
                    </div>
                )}
                {!!showThemePublishDialog && (
                    <ThemePublishDialog
                        key="theme-publish-dialog"
                        onClose={() => setShowThemePublishDialog(false)}
                        onPublish={performThemePublish}
                    />
                )}
                {(isCropping && !!rawImage) && (
                    <ImageCropper
                        key="reptile-image-cropper"
                        image={rawImage}
                        onCrop={(cropped) => {
                            setAvatar(cropped);
                            setIsEmojiMode(false);
                            setIsCropping(false);
                            setRawImage(null);
                        }}
                        onCancel={() => {
                            setIsCropping(false);
                            setRawImage(null);
                        }}
                    />
                )}
                {(isProfileCropping && !!profileRawImage) && (
                    <ImageCropper
                        key="profile-image-cropper"
                        image={profileRawImage}
                        onCrop={(cropped) => {
                            setProfileAvatar(cropped);
                            setIsProfileCropping(false);
                            setProfileRawImage(null);
                        }}
                        onCancel={() => {
                            setIsProfileCropping(false);
                            setProfileRawImage(null);
                        }}
                    />
                )}

                <ConfirmDialog
                    key="delete-confirm-dialog"
                    isOpen={showConfirmDelete}
                    onClose={() => {
                        setShowConfirmDelete(false);
                        setDeleteTarget(null);
                    }}
                    onConfirm={() => {
                        if (deleteTarget) {
                            deleteReptile(deleteTarget.id);
                            if (view === "edit_reptile") setView("reptiles");
                            setShowConfirmDelete(false);
                            setDeleteTarget(null);
                        }
                    }}
                    title={t("settings.delete_confirm").replace('{{name}}', deleteTarget?.name || "")}
                    variant="danger"
                />

                <Toast
                    message={toastState.message}
                    isVisible={toastState.isOpen}
                    onClose={() => setToastState(prev => ({ ...prev, isOpen: false }))}
                />
            </AnimatePresence>
        </main>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[var(--background)] p-4 flex items-center justify-center text-[var(--muted)]">Loading settings...</div>}>
            <SettingsContent />
        </Suspense>
    );
}
