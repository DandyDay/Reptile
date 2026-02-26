"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGamification } from "@/lib/gamification-store";
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

function Generate3DButton({ reptileId }: { reptileId: string }) {
  const { generate3DModel, model3DStatus } = useGamification();
  const { reptiles } = useReptileLogs();
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);

  const reptile = reptiles.find((r) => r.id === reptileId);
  const photoUrl = reptile?.avatar;
  const hasPhoto = photoUrl && !photoUrl.startsWith("data:image/svg") && photoUrl !== "" && photoUrl.length > 5 && !["🦎", "🐍", "🦕", "🐊", "🦖"].includes(photoUrl);

  const handleGenerate = async () => {
    if (!hasPhoto || !photoUrl) return;
    setGenerating(true);
    await generate3DModel(reptileId, photoUrl);
    setGenerating(false);
  };

  if (model3DStatus?.status === "processing" || generating) {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm" style={{ background: "var(--card)", color: "var(--text)" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-4 h-4 rounded-full border-2"
            style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }}
          />
          {t("gamification.model_processing")}
        </div>
      </div>
    );
  }

  if (model3DStatus?.status === "failed") {
    return (
      <div className="text-center py-3">
        <p className="text-sm mb-2" style={{ color: "var(--danger)" }}>
          {t("gamification.model_failed")}
        </p>
        <button
          onClick={handleGenerate}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--primary)", color: "var(--background)" }}
        >
          {t("gamification.generate_3d")}
        </button>
      </div>
    );
  }

  if (!hasPhoto) {
    return (
      <p className="text-xs text-center py-2" style={{ color: "var(--muted)" }}>
        {t("gamification.no_photo")}
      </p>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
      style={{ background: "var(--primary)", color: "var(--background)" }}
    >
      ✨ {t("gamification.generate_3d")}
    </button>
  );
}

export function CreatureViewer() {
  const { totalXp, model3DStatus, fetchModel3DStatus, isLoaded } = useGamification();
  const { currentReptile } = useReptileLogs();
  const { t, lang } = useTranslation();
  const level = getLevel(totalXp);
  const levelName = getLevelName(level, lang);
  const [showSurprise, setShowSurprise] = useState(false);
  const [surpriseReaction, setSurpriseReaction] = useState("");

  useEffect(() => {
    if (currentReptile?.id) {
      fetchModel3DStatus(currentReptile.id);
    }
  }, [currentReptile?.id]);

  if (!isLoaded) return null;

  const glbUrl = model3DStatus?.status === "succeeded" ? model3DStatus.glbUrl : null;
  const hasModel = !!glbUrl;
  const canGenerate = level >= UNLOCK_3D_LEVEL && !hasModel;

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
        {/* Surprise overlay */}
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
          <Canvas
            camera={{ position: [0, 0, 2.5], fov: 50 }}
            style={{ background: "transparent", cursor: "grab" }}
          >
            <CreatureScene glbUrl={glbUrl} level={level} onSurprise={handleSurprise} />
          </Canvas>
        ) : (
          // Pre-level-5: Egg placeholder with level progress hint
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <motion.div
              animate={{
                y: [0, -8, 0],
                rotate: [-3, 3, -3],
              }}
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

      {/* Generate button */}
      {canGenerate && currentReptile?.id && (
        <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
          <Generate3DButton reptileId={currentReptile.id} />
        </div>
      )}

      {/* Hint for tickle/click */}
      {hasModel && (
        <div
          className="px-3 pb-3 text-center text-xs"
          style={{ color: "var(--muted)" }}
        >
          👆 탭하면 놀라고, 문질러주면 간지러워해요!
        </div>
      )}
    </div>
  );
}
