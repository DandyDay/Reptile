"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface ThemePublishDialogProps {
    onClose: () => void;
    onPublish: (name: string) => Promise<void>;
}

export function ThemePublishDialog({ onClose, onPublish }: ThemePublishDialogProps) {
    const { t } = useTranslation();
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError(null);

        try {
            await onPublish(name);
            onClose();
        } catch (err: any) {
            setError(err.message || t("settings.theme_publish_failed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="relative w-full max-w-sm overflow-hidden border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--foreground)]"
                    disabled={loading}
                >
                    <X size={20} />
                </button>

                <h2 className="mb-2 text-xl font-bold text-center text-[var(--foreground)]">
                    {t("settings.publish_theme")}
                </h2>
                <p className="mb-6 text-sm text-center text-[var(--muted)]">
                    {t("settings.theme_name_prompt")}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("settings.theme_name_placeholder") || "My Awesome Theme"}
                            required
                            className="bg-[var(--background)] border-[var(--border)]"
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <p className="text-xs font-bold text-red-500 animate-pulse">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1"
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="flex-1 bg-[var(--primary)] text-white hover:opacity-90 font-bold"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("common.save") || "Publish"}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
