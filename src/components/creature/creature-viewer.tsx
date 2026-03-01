"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGamification, MAX_MODEL_SLOTS } from "@/lib/gamification-store";
import { getLevel, UNLOCK_3D_LEVEL, getLevelName } from "@/lib/gamification";
import { useReptileLogs } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";

// Dynamically import the Canvas to avoid SSR issues
const Canvas = dynamic(
  () => import("@react-three/fiber").then((mod) => mod.Canvas),
  { ssr: false }
);

const CreatureScene = dynamic(
  () => import("./creature-scene").then((mod) => mod.CreatureScene),
  { ssr: false }
);

function isRealPhoto(url: string | undefined): boolean {
  if (!url) return false;
  if (url.length <= 5) return false;
  if (["🦎", "🐍", "🦕", "🐊", "🦖"].includes(url)) return false;
  if (url.startsWith("data:image/svg")) return false;
  return true;
}

function Generate3DModal({
  reptileId,
  slot,
  onClose,
}: {
  reptileId: string;
  slot: number;
  onClose: () => void;
}) {
  const { generate3DModel } = useGamification();
  const { reptiles } = useReptileLogs();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reptile = reptiles.find((r) => r.id === reptileId);
  const profilePhoto = isRealPhoto(reptile?.avatar) ? reptile!.avatar : null;

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(profilePhoto);
  const [generating, setGenerating] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSelectedPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!selectedPhoto) return;
    setGenerating(true);
    await generate3DModel(reptileId, selectedPhoto, slot);
    setGenerating(false);
    onClose();
  };

  const tips = [
    { icon: "🦎", text: t("gamification.guide_tip_1") },
    { icon: "💡", text: t("gamification.guide_tip_2") },
    { icon: "🎨", text: t("gamification.guide_tip_3") },
    { icon: "📐", text: t("gamification.guide_tip_4") },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-lg rounded-t-3xl"
        style={{ background: "var(--card)", maxHeight: "90vh", overflowY: "auto", paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
        </div>

        <div className="px-5 pb-8 pt-2">
          <h2 className="text-base font-bold mb-4" style={{ color: "var(--text)" }}>
            ✨ {t("gamification.guide_title")} <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>#{slot}</span>
          </h2>

          <div
            className="rounded-2xl p-3 mb-4"
            style={{ background: "color-mix(in srgb, var(--primary), transparent 90%)", border: "1px solid color-mix(in srgb, var(--primary), transparent 75%)" }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--primary)" }}>
              {t("gamification.guide_tip_header")}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {tips.map((tip, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-sm">{tip.icon}</span>
                  <span className="text-xs" style={{ color: "var(--text)" }}>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>
            {t("gamification.guide_select_photo")}
          </p>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelectedPhoto(profilePhoto)}
              disabled={!profilePhoto}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all"
              style={{
                border: `2px solid ${selectedPhoto === profilePhoto && profilePhoto ? "var(--primary)" : "var(--border)"}`,
                background: selectedPhoto === profilePhoto && profilePhoto ? "color-mix(in srgb, var(--primary), transparent 88%)" : "var(--background)",
                color: profilePhoto ? "var(--text)" : "var(--muted)",
                opacity: profilePhoto ? 1 : 0.5,
              }}
            >
              {profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profilePhoto} alt="" className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: "var(--border)" }}>🦎</div>
              )}
              <span>{profilePhoto ? t("gamification.guide_use_profile") : t("gamification.guide_no_profile_photo")}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all"
              style={{
                border: `2px solid ${selectedPhoto && selectedPhoto !== profilePhoto ? "var(--primary)" : "var(--border)"}`,
                background: selectedPhoto && selectedPhoto !== profilePhoto ? "color-mix(in srgb, var(--primary), transparent 88%)" : "var(--background)",
                color: "var(--text)",
              }}
            >
              {selectedPhoto && selectedPhoto !== profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedPhoto} alt="" className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: "var(--border)" }}>📷</div>
              )}
              <span>{t("gamification.guide_upload_new")}</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={handleGenerate}
            disabled={!selectedPhoto || generating}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "var(--primary)", color: "var(--background)" }}
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-4 h-4 rounded-full border-2"
                  style={{ borderColor: "var(--background)", borderTopColor: "transparent" }}
                />
                {t("gamification.generating")}
              </span>
            ) : (
              `✨ ${t("gamification.guide_generate")}`
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function CreatureViewer() {
  const { totalXp, models3D, activeSlot, setActiveSlot, fetchModel3DStatus, isLoaded } = useGamification();
  const { currentReptile } = useReptileLogs();
  const { t, lang } = useTranslation();
  const level = getLevel(totalXp);
  const levelName = getLevelName(level, lang);
  const [showSurprise, setShowSurprise] = useState(false);
  const [surpriseReaction, setSurpriseReaction] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (currentReptile?.id) {
      fetchModel3DStatus(currentReptile.id);
    }
  }, [currentReptile?.id, fetchModel3DStatus]);

  if (!isLoaded) return null;

  const activeModel = models3D.find((m) => m.slot === activeSlot) ?? null;
  const rawGlbUrl = activeModel?.status === "succeeded" ? activeModel.glbUrl : null;
  const glbUrl = rawGlbUrl ? `/api/meshy/glb?url=${encodeURIComponent(rawGlbUrl)}` : null;
  const hasModel = !!glbUrl;
  const isProcessing = activeModel?.status === "processing";
  const isFailed = activeModel?.status === "failed";
  const isEmpty = !activeModel;
  const canGenerate = level >= UNLOCK_3D_LEVEL && (isEmpty || isFailed);

  const handleSurprise = () => {
    const reactions = ["!", "!!", "😱", "😲", "⚡"];
    setSurpriseReaction(reactions[Math.floor(Math.random() * reactions.length)]);
    setShowSurprise(true);
    if (navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => setShowSurprise(false), 700);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden mb-4"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="p-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🦎</span>
          <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>
            {t("gamification.creature_title")}
          </span>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{ background: "color-mix(in srgb, var(--primary), transparent 80%)", color: "var(--primary)" }}
        >
          Lv.{level} {levelName}
        </span>
      </div>

      {/* 3D Canvas area */}
      <div className="relative" style={{ height: 280 }}>
        <AnimatePresence>
          {showSurprise && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1.4, y: -10 }}
              exit={{ opacity: 0, scale: 0.5, y: -30 }}
              transition={{ type: "spring", damping: 12 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
              style={{
                fontSize: "2.5rem",
                fontWeight: 900,
                color: "var(--primary)",
                textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                filter: "drop-shadow(0 0 8px var(--primary))",
              }}
            >
              {surpriseReaction}
            </motion.div>
          )}
        </AnimatePresence>

        {level >= UNLOCK_3D_LEVEL ? (
          <>
            {hasModel ? (
              <Canvas
                camera={{ position: [0, 0, 2.5], fov: 50 }}
                style={{ background: "transparent", cursor: "grab" }}
              >
                <CreatureScene glbUrl={glbUrl} level={level} onSurprise={handleSurprise} />
              </Canvas>
            ) : isProcessing ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-10 h-10 rounded-full border-4"
                  style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }}
                />
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  {t("gamification.model_processing")}
                </p>
              </div>
            ) : (
              /* Empty or failed slot */
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <motion.div
                  animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  style={{ fontSize: "4rem" }}
                >
                  {isFailed ? "💔" : "✨"}
                </motion.div>
                <p className="text-xs text-center px-6" style={{ color: "var(--muted)" }}>
                  {isFailed
                    ? t("gamification.model_failed")
                    : lang === "ko"
                    ? `슬롯 #${activeSlot} — 사진으로 3D 모델을 만들어보세요!`
                    : `Slot #${activeSlot} — Generate a 3D model from a photo!`}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              style={{ fontSize: "5rem" }}
            >
              🥚
            </motion.div>
            <p className="text-xs text-center px-4" style={{ color: "var(--muted)" }}>
              {t("gamification.creature_placeholder")}
            </p>
          </div>
        )}
      </div>

      {/* Slot selector */}
      {level >= UNLOCK_3D_LEVEL && (
        <div className="flex items-center justify-center gap-2 py-2" style={{ borderTop: "1px solid var(--border)" }}>
          {Array.from({ length: MAX_MODEL_SLOTS }, (_, i) => i + 1).map((slot) => {
            const m = models3D.find((x) => x.slot === slot);
            const isActive = slot === activeSlot;
            const hasContent = m && m.status === "succeeded";
            const isProc = m?.status === "processing";

            return (
              <button
                key={slot}
                onClick={() => setActiveSlot(slot)}
                className="relative flex items-center justify-center transition-all"
                style={{
                  width: isActive ? 32 : 24,
                  height: 8,
                  borderRadius: 4,
                  background: isActive
                    ? "var(--primary)"
                    : hasContent
                    ? "color-mix(in srgb, var(--primary), transparent 50%)"
                    : "var(--border)",
                  transition: "width 0.2s ease",
                }}
              >
                {isProc && (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="absolute inset-0 rounded"
                    style={{ background: "var(--primary)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Generate / hint */}
      {level >= UNLOCK_3D_LEVEL && (
        <div className="px-3 pb-3">
          {canGenerate && currentReptile?.id ? (
            <>
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{ background: "var(--primary)", color: "var(--background)" }}
              >
                ✨ {t("gamification.generate_3d")}
              </button>
              <AnimatePresence>
                {showModal && currentReptile?.id && (
                  <Generate3DModal
                    reptileId={currentReptile.id}
                    slot={activeSlot}
                    onClose={() => setShowModal(false)}
                  />
                )}
              </AnimatePresence>
            </>
          ) : hasModel ? (
            <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
              👆 {lang === "ko" ? "탭하면 놀라고, 드래그하면 돌아요!" : "Tap to surprise, drag to rotate!"}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
