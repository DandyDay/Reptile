"use client";

import { useRef, useState, useEffect, Suspense, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

interface CreatureModelProps {
  url: string;
  level: number;
  onSurprise: () => void;
  onLoad?: () => void;
}

function CreatureModel({ url, level, onSurprise, onLoad }: CreatureModelProps) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const [anim, setAnim] = useState<"idle" | "surprised">("idle");

  // Drag state
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  // Physics-based rotation (Y = horizontal drag, X = vertical drag)
  const rotYRef = useRef(0);
  const rotXRef = useRef(0);
  const velYRef = useRef(0);
  const velXRef = useRef(0);

  // X rotation clamp so it doesn't flip fully (±70°)
  const X_CLAMP = Math.PI * 0.38;

  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const baseScale = 0.8 + Math.max(0, level - 5) * 0.04;

  // Notify parent when model is ready
  useEffect(() => { onLoad?.(); }, [onLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (anim === "surprised") {
      const t = setTimeout(() => setAnim("idle"), 800);
      return () => clearTimeout(t);
    }
  }, [anim]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    if (!isDraggingRef.current) {
      // Inertia with friction
      velYRef.current *= 0.88;
      velXRef.current *= 0.88;
      rotYRef.current += velYRef.current;
      // X drifts back toward 0 when not dragging (gravity-like return)
      rotXRef.current += velXRef.current;
      rotXRef.current *= 0.96; // gentle spring-back to horizon
    }

    // Clamp X so model doesn't flip
    rotXRef.current = Math.max(-X_CLAMP, Math.min(X_CLAMP, rotXRef.current));

    if (anim === "idle") {
      groupRef.current.position.y = Math.sin(t * 1.2) * 0.04;
      groupRef.current.rotation.y = rotYRef.current;
      groupRef.current.rotation.x = rotXRef.current;
      groupRef.current.rotation.z = 0;
      groupRef.current.scale.setScalar(baseScale);
    } else if (anim === "surprised") {
      const progress = ((t * 2) % 2) / 2;
      groupRef.current.position.y = Math.sin(progress * Math.PI) * 0.3;
      groupRef.current.rotation.y = rotYRef.current;
      groupRef.current.rotation.x = rotXRef.current;
      groupRef.current.rotation.z = Math.sin(progress * Math.PI * 3) * 0.15;
      groupRef.current.scale.setScalar(baseScale + Math.sin(progress * Math.PI) * 0.15);
    }
  });

  const handlePointerDown = (e: THREE.Event) => {
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    velYRef.current = 0;
    velXRef.current = 0;
    const pe = e as unknown as PointerEvent;
    lastPointerRef.current = { x: pe.clientX, y: pe.clientY };
  };

  const handlePointerMove = (e: THREE.Event) => {
    if (!isDraggingRef.current || !lastPointerRef.current) return;
    const pe = e as unknown as PointerEvent;
    const dx = pe.clientX - lastPointerRef.current.x;
    const dy = pe.clientY - lastPointerRef.current.y;

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      hasDraggedRef.current = true;
      const deltaY = dx * 0.009;
      const deltaX = dy * 0.009;
      rotYRef.current += deltaY;
      rotXRef.current += deltaX;
      velYRef.current = deltaY;
      velXRef.current = deltaX;
      lastPointerRef.current = { x: pe.clientX, y: pe.clientY };
    }
  };

  const handlePointerUp = (e: THREE.Event) => {
    isDraggingRef.current = false;
    lastPointerRef.current = null;
    if (!hasDraggedRef.current && anim !== "surprised") {
      velYRef.current = 0;
      velXRef.current = 0;
      setAnim("surprised");
      onSurprise();
    }
    hasDraggedRef.current = false;
    const pe = e as unknown as PointerEvent;
    (e as unknown as { target: Element }).target instanceof Element &&
      (e as unknown as { target: Element }).target.releasePointerCapture?.((pe as PointerEvent).pointerId);
  };

  return (
    <>
      {/* Invisible full-canvas hit plane for drag events */}
      <mesh
        position={[0, 0, 1]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={groupRef}>
        <primitive object={clonedScene} />
      </group>
    </>
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
  onLoad,
}: {
  glbUrl: string | null;
  level: number;
  onSurprise: () => void;
  onLoad?: () => void;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
      <Environment preset="city" />
      <Suspense fallback={null}>
        {glbUrl ? (
          <CreatureModel url={glbUrl} level={level} onSurprise={onSurprise} onLoad={onLoad} />
        ) : null}
      </Suspense>
    </>
  );
}
