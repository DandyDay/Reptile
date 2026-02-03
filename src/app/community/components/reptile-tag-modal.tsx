import { X, Turtle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ReptileTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    reptiles: any[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}

export function ReptileTagModal({ isOpen, onClose, reptiles, selectedId, onSelect }: ReptileTagModalProps) {
    const { t } = useTranslation();

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-sm overflow-hidden rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-[var(--border)] bg-[var(--card)] shadow-2xl z-10"
                    >
                        {/* Header Area */}
                        <div className="p-6 pb-0 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20 rotate-3">
                                    <Turtle className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-black text-[var(--foreground)] tracking-tight">{t("community.tag_profile")}</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="h-8 w-8 flex items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 pt-8 space-y-2 max-h-[400px] overflow-y-auto scrollbar-none">
                            {/* Reptiles List */}
                            {reptiles.map((reptile) => {
                                const isSelected = selectedId === reptile.id;
                                const isImage = reptile.avatar.startsWith("data:") || reptile.avatar.startsWith("http");

                                return (
                                    <button
                                        key={reptile.id}
                                        onClick={() => {
                                            onSelect(isSelected ? null : reptile.id);
                                            onClose();
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-4 rounded-2xl transition-all border-2 group",
                                            isSelected
                                                ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-md shadow-[var(--primary)]/20"
                                                : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
                                        )}
                                    >
                                        <div className="h-12 w-12 rounded-full overflow-hidden flex items-center justify-center bg-[var(--background)] border-2 border-[var(--border)] group-hover:scale-110 transition-transform">
                                            {isImage ? (
                                                <img src={reptile.avatar} alt={reptile.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-xl select-none">{reptile.avatar}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="text-sm font-black text-[var(--foreground)] truncate">{reptile.name}</p>
                                            <p className="text-[10px] text-[var(--muted)] font-medium truncate uppercase tracking-tight">{reptile.species}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-6 pt-2 pb-8 sm:pb-6">
                            <Button
                                variant="secondary"
                                onClick={onClose}
                                className="w-full h-12 rounded-2xl font-black border-none bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 text-[var(--foreground)]"
                            >
                                {t("common.cancel")}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

