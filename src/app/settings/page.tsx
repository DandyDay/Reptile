"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useReptileLogs } from "@/lib/store";
import { ArrowLeft } from "lucide-react";
import { ThemeStore } from "@/components/theme-store";
import { ThemePublishDialog } from "@/components/theme-publish-dialog";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { FeedingPresetManager } from "@/components/feeding-preset-manager";
import { AnimatePresence } from "framer-motion";
import { ImageCropper } from "@/components/image-cropper";
import { AuthDialog } from "@/components/auth-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { supabase } from "@/lib/supabase";
import { Toast } from "@/components/toast";
import { SettingsMainView } from "@/components/settings/settings-main-view";
import { SettingsReptileList } from "@/components/settings/settings-reptile-list";
import { SettingsAppearance } from "@/components/settings/settings-appearance";
import { SettingsProfile } from "@/components/settings/settings-profile";
import { SettingsReptileForm } from "@/components/settings/settings-reptile-form";

export type SettingsView = "main" | "reptiles" | "add_reptile" | "edit_reptile" | "appearance" | "data" | "profile" | "theme_store";

function SettingsContent() {
    const {
        reptiles, addReptile, updateReptile, deleteReptile, visualSettings,
        setCalViewMode, setLanguage, setTheme, setCustomColor,
        session
    } = useReptileLogs();

    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();

    const [view, setView] = useState<SettingsView>("main");

    // Form settings (lifted state for image cropping coordination)
    const [avatar, setAvatar] = useState("🦎");
    const [isEmojiMode, setIsEmojiMode] = useState(true);
    const [editingReptileId, setEditingReptileId] = useState<string | null>(null);
    const [rawImage, setRawImage] = useState<string | null>(null);
    const [isCropping, setIsCropping] = useState(false);

    // Dialog states
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

    const resetForm = () => {
        setAvatar("🦎");
        setIsEmojiMode(true);
        setEditingReptileId(null);
    };

    const handleEditClick = (id: string) => {
        const r = reptiles.find(x => x.id === id);
        if (r) {
            setAvatar(r.avatar);
            setIsEmojiMode(!r.avatar.startsWith('data:') && !r.avatar.startsWith('http'));
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

    const handleFormSubmit = (data: any) => {
        if (view === "edit_reptile" && editingReptileId) {
            updateReptile(editingReptileId, data);
        } else {
            addReptile({
                ...data,
                color: "emerald",
            });
        }

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

    const handleImageSelect = (file: File) => {
        if (file.size > 5 * 1024 * 1024) {
            alert("Image too large (max 5MB)");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setRawImage(reader.result as string);
            setIsCropping(true);
        };
        reader.readAsDataURL(file);
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

    return (
        <main className="min-h-screen bg-[var(--background)] p-4 text-[var(--foreground)] md:p-8 pb-32">
            <div className="mx-auto max-w-2xl space-y-8">
                {renderHeader()}

                <div className="min-h-[400px]">
                    {view === "main" && (
                        <SettingsMainView
                            setView={setView}
                            t={t}
                            session={session}
                            profileData={{
                                name: profileName,
                                bio: profileBio,
                                avatar: profileAvatar
                            }}
                            reptileCount={reptiles.length}
                            onSignOut={async () => await supabase.auth.signOut()}
                            onSignIn={() => setShowAuthDialog(true)}
                        />
                    )}

                    {view === "reptiles" && (
                        <SettingsReptileList
                            reptiles={reptiles}
                            setView={setView}
                            onEdit={handleEditClick}
                            onDelete={(target) => {
                                setDeleteTarget(target);
                                setShowConfirmDelete(true);
                            }}
                            onResetForm={resetForm}
                            onSignIn={() => setShowAuthDialog(true)}
                            session={session}
                            t={t}
                        />
                    )}

                    {(view === "add_reptile" || view === "edit_reptile") && (
                        <SettingsReptileForm
                            key={view + (editingReptileId || 'new')}
                            initialData={view === "edit_reptile" && editingReptileId ? reptiles.find(r => r.id === editingReptileId) : undefined}
                            onSubmit={handleFormSubmit}
                            onCancel={() => setView("reptiles")}
                            onDelete={(id, name) => {
                                setDeleteTarget({ id, name });
                                setShowConfirmDelete(true);
                            }}
                            visualSettings={visualSettings}
                            onImageSelect={handleImageSelect}
                            avatar={avatar}
                            setAvatar={setAvatar}
                            isEmojiMode={isEmojiMode}
                            setIsEmojiMode={setIsEmojiMode}
                            t={t}
                        />
                    )}

                    {view === "appearance" && (
                        <SettingsAppearance
                            visualSettings={visualSettings}
                            setTheme={setTheme}
                            setLanguage={setLanguage}
                            setCalViewMode={setCalViewMode}
                            setCustomColor={setCustomColor}
                            setView={setView}
                            onPublishTheme={handlePublishTheme}
                            showCustomColors={showCustomColors}
                            setShowCustomColors={setShowCustomColors}
                            t={t}
                        />
                    )}

                    {view === "data" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <FeedingPresetManager />
                        </div>
                    )}

                    {view === "profile" && (
                        <SettingsProfile
                            profileName={profileName}
                            setProfileName={setProfileName}
                            profileBio={profileBio}
                            setProfileBio={setProfileBio}
                            profileAvatar={profileAvatar}
                            isProfileLoading={isProfileLoading}
                            isSavingProfile={isSavingProfile}
                            onSaveProfile={handleSaveProfile}
                            onProfileImageChange={handleProfileImageChange}
                            fileInputRef={profileFileInputRef}
                            session={session}
                        />
                    )}

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
