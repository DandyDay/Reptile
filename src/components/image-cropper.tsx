"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { X, Check, ZoomIn, ZoomOut, Move } from "lucide-react";
import { Button } from "./ui/button";

interface ImageCropperProps {
    image: string;
    onCrop: (croppedImage: string) => void;
    onCancel: () => void;
}

export function ImageCropper({ image, onCrop, onCancel }: ImageCropperProps) {
    const [zoom, setZoom] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Position state
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const handleCrop = () => {
        if (!imageRef.current || !containerRef.current) return;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // We want a square output for the circle
        const size = 400;
        canvas.width = size;
        canvas.height = size;

        const img = imageRef.current;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();

        // Calculate the actual dimensions and positions
        const displayedWidth = img.clientWidth * zoom;
        const displayedHeight = img.clientHeight * zoom;

        // The crop area is the center of the container
        // Coordinates of the image relative to the container center
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Offset of the image center from container center
        const imgOffsetX = x.get();
        const imgOffsetY = y.get();

        // Source coordinates on the original image memory
        const scaleX = img.naturalWidth / (img.clientWidth * zoom);
        const scaleY = img.naturalHeight / (img.clientHeight * zoom);

        // Map the 400x400 canvas area back to the original image
        // The crop area in UI is 256x256 (w-64 h-64)
        const uiCropSize = 256;
        const sourceCropWidth = uiCropSize * scaleX;
        const sourceCropHeight = uiCropSize * scaleY;

        // Calculate source X and Y
        // Image center in UI is (rect.width/2 + x, rect.height/2 + y)
        // Crop area center in UI is (rect.width/2, rect.height/2)
        // So crop area center relative to image center is (-x, -y)
        const sourceCenterX = (img.naturalWidth / 2) - (x.get() * scaleX);
        const sourceCenterY = (img.naturalHeight / 2) - (y.get() * scaleY);

        const sourceX = sourceCenterX - (sourceCropWidth / 2);
        const sourceY = sourceCenterY - (sourceCropHeight / 2);

        // Draw onto canvas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
            img,
            sourceX, sourceY, sourceCropWidth, sourceCropHeight,
            0, 0, size, size
        );

        onCrop(canvas.toDataURL("image/jpeg", 0.9));
    };

    return (
        <div className="fixed inset-0 z-[110] flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <button onClick={onCancel} className="p-2 text-white/60 hover:text-white transition-colors">
                    <X className="h-6 w-6" />
                </button>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">사진 편집</h2>
                <button onClick={handleCrop} className="p-2 text-[var(--primary)] hover:opacity-80 transition-opacity">
                    <Check className="h-6 w-6" />
                </button>
            </div>

            {/* Cropping Area */}
            <div
                ref={containerRef}
                className="relative flex-1 overflow-hidden touch-none flex items-center justify-center"
            >
                {/* Image Layer */}
                <motion.img
                    ref={imageRef}
                    src={image}
                    drag
                    dragMomentum={false}
                    style={{ x, y, scale: zoom, cursor: 'grab' }}
                    whileDrag={{ cursor: 'grabbing' }}
                    className="max-w-none transition-transform duration-75 select-none"
                    onDragStart={(e) => e.preventDefault()}
                />

                {/* Overlay Guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Dark background with hole */}
                    <div className="absolute inset-0 bg-black/40" style={{ clipPath: 'polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, 50% 50%, 50% 50%)' }} />
                    <div className="w-64 h-64 rounded-full border-2 border-dashed border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />

                    {/* Label */}
                    <div className="absolute top-[calc(50%+140px)] text-white/40 text-[10px] font-medium uppercase tracking-[0.2em]">
                        드래그하여 이동 • 두 손가락으로 확대
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="p-8 bg-black/40 border-t border-white/10 space-y-6">
                <div className="flex items-center gap-6">
                    <ZoomOut className="h-4 w-4 text-white/40" />
                    <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.01"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                    />
                    <ZoomIn className="h-4 w-4 text-white/40" />
                </div>

                <div className="flex gap-4">
                    <Button variant="secondary" className="flex-1 h-12 rounded-2xl bg-white/5 border-white/10 text-white" onClick={onCancel}>
                        취소
                    </Button>
                    <Button className="flex-1 h-12 rounded-2xl shadow-lg" onClick={handleCrop}>
                        적용하기
                    </Button>
                </div>
            </div>
        </div>
    );
}
