"use client";

import { useRef, RefObject, useState } from "react";
import { User, Camera, Loader2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User as UserType } from "@supabase/supabase-js";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTranslation } from "@/lib/i18n";

interface SettingsProfileProps {
    profileName: string;
    setProfileName: (name: string) => void;
    profileBio: string;
    setProfileBio: (bio: string) => void;
    profileAvatar: string;
    isProfileLoading: boolean;
    isSavingProfile: boolean;
    onSaveProfile: () => void;
    onProfileImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: RefObject<HTMLInputElement | null>;
    session: { user: UserType } | null;
    onDeleteAccount: () => Promise<void>;
}

export function SettingsProfile({
    profileName,
    setProfileName,
    profileBio,
    setProfileBio,
    profileAvatar,
    isProfileLoading,
    isSavingProfile,
    onSaveProfile,
    onProfileImageChange,
    fileInputRef,
    session,
    onDeleteAccount
}: SettingsProfileProps) {
    const { t } = useTranslation();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        await onDeleteAccount();
        setIsDeleting(false);
        setShowDeleteConfirm(false);
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4">
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
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                                    >
                                        <Camera className="h-6 w-6 text-white" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-sm text-[var(--primary)] hover:underline"
                                >
                                    프로필 사진 변경
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    className="hidden"
                                    onChange={onProfileImageChange}
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
                                    className="w-full h-12 rounded-xl font-bold"
                                    onClick={onSaveProfile}
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

                {session && !isProfileLoading && (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full p-4 rounded-xl flex items-center justify-center gap-2 text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold text-sm"
                    >
                        <UserX className="h-4 w-4" />
                        {t("common.delete_account" as any)}
                    </button>
                )}
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title={t("common.delete_account" as any)}
                description={t("common.delete_account_confirm" as any)}
                variant="danger"
            />
        </div>
    );
}
