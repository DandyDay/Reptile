"use client";

import { useRef, useState, useEffect, Suspense, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
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
  const [anim, setAnim] = useState<"idle" | "surprised">("idle");
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const userRotationRef = useRef(0); // accumulated Y rotation from drag

  // Memoize clone to avoid expensive re-clone on every render
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Growth scale by level (5 = base, grows slowly)
  const baseScale = 0.8 + Math.max(0, level - 5) * 0.04;

  useEffect(() => {
    if (anim === "surprised") {
      const t = setTimeout(() => setAnim("idle"), 800);
      return () => clearTimeout(t);
    }
  }, [anim]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    if (anim === "idle") {
      groupRef.current.position.y = Math.sin(t * 1.2) * 0.04;
      // Idle gentle sway + user drag rotation
      groupRef.current.rotation.y = userRotationRef.current + Math.sin(t * 0.4) * 0.08;
      groupRef.current.scale.setScalar(baseScale);
    } else if (anim === "surprised") {
      const progress = ((t * 2) % 2) / 2;
      groupRef.current.position.y = Math.sin(progress * Math.PI) * 0.3;
      groupRef.current.rotation.z = Math.sin(progress * Math.PI * 3) * 0.15;
      groupRef.current.rotation.y = userRotationRef.current;
      const scalePulse = baseScale + Math.sin(progress * Math.PI) * 0.15;
      groupRef.current.scale.setScalar(scalePulse);
    }
  });

  const handlePointerDown = (e: THREE.Event) => {
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    const pe = e as unknown as PointerEvent;
    lastPointerRef.current = { x: pe.clientX, y: pe.clientY };
    (e as unknown as PointerEvent).currentTarget &&
      (e as unknown as { target: Element }).target instanceof Element &&
      (e as unknown as { target: Element }).target.setPointerCapture?.((pe as PointerEvent).pointerId);
  };

  const handlePointerMove = (e: THREE.Event) => {
    if (!isDraggingRef.current || !lastPointerRef.current) return;
    const pe = e as unknown as PointerEvent;
    const dx = pe.clientX - lastPointerRef.current.x;
    if (Math.abs(dx) > 3) {
      hasDraggedRef.current = true;
      userRotationRef.current += dx * 0.01;
      lastPointerRef.current = { x: pe.clientX, y: pe.clientY };
    }
  };

  const handlePointerUp = (e: THREE.Event) => {
    isDraggingRef.current = false;
    // If barely moved → treat as tap → surprised
    if (!hasDraggedRef.current && anim !== "surprised") {
      setAnim("surprised");
      onSurprise();
    }
    lastPointerRef.current = null;
    hasDraggedRef.current = false;
    const pe = e as unknown as PointerEvent;
    (e as unknown as { target: Element }).target instanceof Element &&
      (e as unknown as { target: Element }).target.releasePointerCapture?.((pe as PointerEvent).pointerId);
  };

  return (
    <group
      ref={groupRef}
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
