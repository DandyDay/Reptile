"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

interface CreatureModelProps {
  url: string;
  level: number;
  onSurprise: () => void;
}

function CreatureModel({ url, level, onSurprise }: CreatureModelProps) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const [anim, setAnim] = useState<"idle" | "surprised" | "tickle">("idle");
  const [isDragging, setIsDragging] = useState(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  // Clone scene to allow multiple renders
  const clonedScene = scene.clone(true);

  // Growth scale by level (5 = base, grows slowly)
  const baseScale = 0.8 + Math.max(0, level - 5) * 0.04;

  useEffect(() => {
    if (anim === "surprised") {
      const t = setTimeout(() => setAnim("idle"), 800);
      return () => clearTimeout(t);
    }
    if (anim === "tickle") {
      const t = setTimeout(() => setAnim("idle"), 1200);
      return () => clearTimeout(t);
    }
  }, [anim]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    if (anim === "idle") {
      // Gentle breathing
      groupRef.current.position.y = Math.sin(t * 1.2) * 0.04;
      groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.08;
      groupRef.current.scale.setScalar(baseScale);
    } else if (anim === "surprised") {
      // Jump back and scale pulse
      const progress = ((t * 2) % 2) / 2;
      groupRef.current.position.y = Math.sin(progress * Math.PI) * 0.3;
      groupRef.current.rotation.z = Math.sin(progress * Math.PI * 3) * 0.15;
      const scalePulse = baseScale + Math.sin(progress * Math.PI) * 0.15;
      groupRef.current.scale.setScalar(scalePulse);
    } else if (anim === "tickle") {
      // Fast wiggle
      groupRef.current.rotation.z = Math.sin(t * 15) * 0.25;
      groupRef.current.position.y = Math.abs(Math.sin(t * 10)) * 0.05;
      groupRef.current.scale.setScalar(baseScale);
    }
  });

  const handleClick = () => {
    setAnim("surprised");
    onSurprise();
  };

  const handlePointerDown = (e: THREE.Event) => {
    setIsDragging(true);
    const pe = e as unknown as PointerEvent;
    lastPointerRef.current = { x: pe.clientX, y: pe.clientY };
  };

  const handlePointerMove = (e: THREE.Event) => {
    if (!isDragging) return;
    const pe = e as unknown as PointerEvent;
    if (lastPointerRef.current) {
      const dx = Math.abs(pe.clientX - lastPointerRef.current.x);
      const dy = Math.abs(pe.clientY - lastPointerRef.current.y);
      if (dx + dy > 10 && anim !== "surprised") {
        setAnim("tickle");
      }
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    lastPointerRef.current = null;
  };

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

function PlaceholderEgg({ level }: { level: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.position.y = Math.sin(t * 1.5) * 0.05;
    meshRef.current.rotation.z = Math.sin(t * 0.8) * 0.05;
  });

  // Egg color by level
  const colors = ["#6ee7b7", "#86efac", "#4ade80", "#22c55e", "#16a34a"];
  const color = colors[Math.min(level - 1, colors.length - 1)];

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

export function CreatureScene({
  glbUrl,
  level,
  onSurprise,
}: {
  glbUrl: string | null;
  level: number;
  onSurprise: () => void;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
      <Environment preset="city" />
      <Suspense fallback={<PlaceholderEgg level={level} />}>
        {glbUrl ? (
          <CreatureModel url={glbUrl} level={level} onSurprise={onSurprise} />
        ) : (
          <PlaceholderEgg level={level} />
        )}
      </Suspense>
    </>
  );
}
