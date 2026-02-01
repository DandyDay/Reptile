"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { X, Check } from "lucide-react";

interface ImageCropperProps {
    image: string;
    onCrop: (croppedImage: string) => void;
    onCancel: () => void;
}

const CROP_SIZE = 280;
const OUTPUT_SIZE = 400;

export function ImageCropper({ image, onCrop, onCancel }: ImageCropperProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const stateRef = useRef({
        x: 0,
        y: 0,
        scale: 1,
        minScale: 0.1,
        isDragging: false,
        lastX: 0,
        lastY: 0,
        lastPinchDist: 0,
    });

    // Draw the image on canvas
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { x, y, scale } = stateRef.current;
        const cw = canvas.width;
        const ch = canvas.height;

        // Clear
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, cw, ch);

        // Draw image centered with offset and scale
        const iw = img.naturalWidth * scale;
        const ih = img.naturalHeight * scale;
        const ix = (cw - iw) / 2 + x;
        const iy = (ch - ih) / 2 + y;

        ctx.drawImage(img, ix, iy, iw, ih);

        // Draw dark overlay with circular hole
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.beginPath();
        ctx.rect(0, 0, cw, ch);
        ctx.arc(cw / 2, ch / 2, CROP_SIZE / 2, 0, Math.PI * 2, true);
        ctx.fill();

        // Draw circle border
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cw / 2, ch / 2, CROP_SIZE / 2, 0, Math.PI * 2);
        ctx.stroke();
    }, []);

    // Constrain position so image covers the crop circle
    const constrain = useCallback(() => {
        const img = imgRef.current;
        const canvas = canvasRef.current;
        if (!img || !canvas) return;

        const state = stateRef.current;
        const iw = img.naturalWidth * state.scale;
        const ih = img.naturalHeight * state.scale;
        const cw = canvas.width;
        const ch = canvas.height;

        // Max offset allowed
        const maxX = Math.max(0, (iw - CROP_SIZE) / 2);
        const maxY = Math.max(0, (ih - CROP_SIZE) / 2);

        state.x = Math.max(-maxX, Math.min(maxX, state.x));
        state.y = Math.max(-maxY, Math.min(maxY, state.y));
    }, []);

    // Initialize
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;

            const canvas = canvasRef.current;
            if (!canvas) return;

            // Calculate min scale so smaller dimension fills crop area
            const scaleW = CROP_SIZE / img.naturalWidth;
            const scaleH = CROP_SIZE / img.naturalHeight;
            const minScale = Math.max(scaleW, scaleH);

            stateRef.current.minScale = minScale;
            stateRef.current.scale = minScale;
            stateRef.current.x = 0;
            stateRef.current.y = 0;

            draw();
        };
        img.src = image;
    }, [image, draw]);

    // Mouse handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        stateRef.current.isDragging = true;
        stateRef.current.lastX = e.clientX;
        stateRef.current.lastY = e.clientY;
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!stateRef.current.isDragging) return;

        const dx = e.clientX - stateRef.current.lastX;
        const dy = e.clientY - stateRef.current.lastY;

        stateRef.current.x += dx;
        stateRef.current.y += dy;
        stateRef.current.lastX = e.clientX;
        stateRef.current.lastY = e.clientY;

        constrain();
        draw();
    }, [constrain, draw]);

    const handleMouseUp = useCallback(() => {
        stateRef.current.isDragging = false;
    }, []);

    // Wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const state = stateRef.current;
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        const newScale = Math.max(state.minScale, Math.min(3, state.scale * delta));
        state.scale = newScale;
        constrain();
        draw();
    }, [constrain, draw]);

    // Touch handlers
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            stateRef.current.isDragging = true;
            stateRef.current.lastX = e.touches[0].clientX;
            stateRef.current.lastY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            stateRef.current.isDragging = false;
            stateRef.current.lastPinchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        const state = stateRef.current;

        if (e.touches.length === 1 && state.isDragging) {
            const dx = e.touches[0].clientX - state.lastX;
            const dy = e.touches[0].clientY - state.lastY;
            state.x += dx;
            state.y += dy;
            state.lastX = e.touches[0].clientX;
            state.lastY = e.touches[0].clientY;
            constrain();
            draw();
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            if (state.lastPinchDist > 0) {
                const scaleFactor = dist / state.lastPinchDist;
                state.scale = Math.max(state.minScale, Math.min(3, state.scale * scaleFactor));
                constrain();
                draw();
            }
            state.lastPinchDist = dist;
        }
    }, [constrain, draw]);

    const handleTouchEnd = useCallback(() => {
        stateRef.current.isDragging = false;
        stateRef.current.lastPinchDist = 0;
    }, []);

    // Crop and export
    const handleCrop = useCallback(() => {
        const img = imgRef.current;
        const canvas = canvasRef.current;
        if (!img || !canvas) return;

        const state = stateRef.current;
        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = OUTPUT_SIZE;
        outputCanvas.height = OUTPUT_SIZE;
        const ctx = outputCanvas.getContext("2d");
        if (!ctx) return;

        // Calculate source coordinates
        const iw = img.naturalWidth * state.scale;
        const ih = img.naturalHeight * state.scale;
        const centerX = (canvas.width - iw) / 2 + state.x + iw / 2;
        const centerY = (canvas.height - ih) / 2 + state.y + ih / 2;

        // Crop area center relative to image
        const cropCenterX = canvas.width / 2;
        const cropCenterY = canvas.height / 2;

        // Offset from image center to crop center
        const offsetX = cropCenterX - centerX;
        const offsetY = cropCenterY - centerY;

        // Convert to source image coordinates
        const srcCenterX = img.naturalWidth / 2 + offsetX / state.scale;
        const srcCenterY = img.naturalHeight / 2 + offsetY / state.scale;
        const srcSize = CROP_SIZE / state.scale;

        // Draw cropped area
        ctx.drawImage(
            img,
            srcCenterX - srcSize / 2,
            srcCenterY - srcSize / 2,
            srcSize,
            srcSize,
            0,
            0,
            OUTPUT_SIZE,
            OUTPUT_SIZE
        );

        onCrop(outputCanvas.toDataURL("image/jpeg", 0.9));
    }, [onCrop]);

    return (
        <div className="fixed inset-0 z-[110] flex flex-col bg-black">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <button
                    onClick={onCancel}
                    className="p-2 text-white/60 hover:text-white"
                >
                    <X className="h-6 w-6" />
                </button>
                <span className="text-sm font-medium text-white">사진 편집</span>
                <button
                    onClick={handleCrop}
                    className="p-2 text-emerald-400 hover:text-emerald-300"
                >
                    <Check className="h-6 w-6" />
                </button>
            </div>

            {/* Canvas */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={400}
                    className="max-w-full max-h-full cursor-grab active:cursor-grabbing"
                    style={{ touchAction: "none" }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                />
            </div>

            {/* Footer */}
            <div className="p-4 text-center text-white/40 text-xs">
                드래그하여 이동 · 스크롤/핀치로 확대/축소
            </div>
        </div>
    );
}
