"use client";

import { Card } from "@/components/ui/card";
import { useReptileLogs } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { useMemo, useState } from "react";
import { ReptileHeader } from "@/components/reptile-header";
import { useTranslation } from "@/lib/i18n";
import { XPLevelBar } from "@/components/gamification/xp-level-bar";
import { QuestPanel } from "@/components/gamification/quest-panel";
import { CreatureViewer } from "@/components/creature/creature-viewer";
import { useGamification } from "@/lib/gamification-store";
import { UNLOCK_3D_LEVEL } from "@/lib/gamification";

export default function StatsPage() {
    const { logs, isLoaded, visualSettings } = useReptileLogs();
    const { t } = useTranslation();
    const { level } = useGamification();
    const locale = visualSettings?.language === 'ko' ? ko : enUS;

    const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

    const stats = useMemo(() => {
        if (!isLoaded) return { lastFed: null, lastPoop: null, lastClean: null };

        // Sort logs descending
        const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            lastFed: sorted.find(l => l.type === 'feeding'),
            lastPoop: sorted.find(l => l.type === 'poop'),
            lastClean: sorted.find(l => l.type === 'cleaning'),
        };
    }, [logs, isLoaded]);

    const StatCard = ({ title, log, icon, type, delay }: { title: string, log: any, icon: string, type: string, delay: number }) => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${delay}ms` }}>
            <Card className="flex flex-col items-center justify-center p-6 border-[var(--border)] shadow-sm">
                <div
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl text-3xl shadow-lg ring-1"
                    style={{
                        backgroundColor: `color-mix(in srgb, var(--color-${type}), transparent 90%)`,
                        color: `var(--color-${type})`,
                        boxShadow: `0 10px 15px -3px color-mix(in srgb, var(--color-${type}), transparent 80%)`,
                        borderColor: `color-mix(in srgb, var(--color-${type}), transparent 80%)`
                    }}
                >
                    {icon}
                </div>
                <h3 className="text-sm font-medium text-[var(--muted)]">{title}</h3>
                <p className="mt-2 text-xl font-bold text-[var(--foreground)]">
                    {log ? formatDistanceToNow(new Date(log.date), { addSuffix: true, locale }) : t("common.no_record")}
                </p>
            </Card>
        </div>
    );

    return (
        <main className="min-h-screen bg-[var(--background)] p-4 text-[var(--foreground)] md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <ReptileHeader />

                {/* Gamification: XP bar */}
                <XPLevelBar />

                {/* Creature viewer (always shown; 3D canvas only unlocks at level 5) */}
                <CreatureViewer />

                {/* Quest panel */}
                <QuestPanel />

                <div className="flex items-center gap-2 mb-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">{t("dashboard.title")}</h2>
                </div>

                <Card className="p-6 border-[var(--border)] overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black">{t("calendar.weight")} {t("community.feed")}</h3>
                        <div className="text-xs text-[var(--muted)] font-bold uppercase tracking-wider">{t("dashboard.last_30_days")}</div>
                    </div>

                    <div className="h-64 w-full relative group/chart">
                        {(() => {
                            const weightLogs = logs
                                .filter(l => l.type === 'weight' && l.weight)
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                .slice(-30); // Last 30 entries max

                            if (weightLogs.length < 2) {
                                return (
                                    <div className="h-full flex flex-col items-center justify-center text-[var(--muted)]">
                                        <div className="text-4xl mb-2 opacity-20">⚖️</div>
                                        <p className="text-xs font-medium">{t("calendar.no_records")}</p>
                                    </div>
                                );
                            }

                            const maxWeight = Math.max(...weightLogs.map(l => l.weight || 0));
                            const minWeight = Math.min(...weightLogs.map(l => l.weight || 0));
                            const range = maxWeight - minWeight || 1;
                            const padding = range * 0.2; // 20% padding
                            const yMax = maxWeight + padding;
                            const yMin = Math.max(0, minWeight - padding);
                            const yRange = yMax - yMin;

                            const points = weightLogs.map((log, i) => {
                                const x = (i / (weightLogs.length - 1)) * 100;
                                const y = 100 - (((log.weight || 0) - yMin) / yRange) * 100;
                                return { x, y, log };
                            });

                            const svgPoints = points.map(p => `${p.x},${p.y}`).join(" ");

                            return (
                                <div className="h-full w-full relative" onClick={() => setSelectedLogId(null)}>
                                    {/* Grid Lines */}
                                    <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-[var(--muted)] pointer-events-none">
                                        {[0, 0.5, 1].map((tick) => (
                                            <div key={tick} className="relative w-full border-t border-[var(--border)] border-dashed">
                                                <span className="absolute -top-3 left-0 bg-[var(--card)] pr-1">
                                                    {(yMax - (tick * yRange)).toFixed(1)}g
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Chart SVG (Lines Only) */}
                                    <svg className="absolute inset-0 h-full w-full overflow-visible pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                                        <defs>
                                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
                                                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d={`M0,100 ${svgPoints.split(' ').map(p => `L${p}`).join(' ')} L100,100 Z`}
                                            fill="url(#chartGradient)"
                                            className="transition-all duration-500"
                                        />
                                        <polyline
                                            points={svgPoints}
                                            fill="none"
                                            stroke="var(--primary)"
                                            strokeWidth="2"
                                            vectorEffect="non-scaling-stroke"
                                            className="drop-shadow-sm transition-all duration-500"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>

                                    {/* Interactive Dots Overlay (Perfect Circles) */}
                                    {points.map((p, i) => (
                                        <div
                                            key={p.log.id}
                                            className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-[var(--background)] border-[2px] border-[var(--primary)] hover:scale-125 hover:bg-[var(--primary)] transition-all cursor-pointer z-10"
                                            style={{ left: `${p.x}%`, top: `${p.y}%` }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedLogId(p.log.id === selectedLogId ? null : p.log.id);
                                            }}
                                        />
                                    ))}

                                    {selectedLogId && (() => {
                                        const p = points.find(pt => pt.log.id === selectedLogId);
                                        if (!p) return null;
                                        const isRightSide = p.x > 50;
                                        const isTop = p.y < 20;

                                        return (
                                            <div
                                                className={`absolute z-20 pointer-events-none transition-all duration-200 ${isRightSide ? 'right-0 mr-2' : 'left-0 ml-2'}`}
                                                style={{
                                                    left: isRightSide ? 'auto' : `${p.x}%`,
                                                    right: isRightSide ? `${100 - p.x}%` : 'auto',
                                                    top: `${p.y}%`,
                                                    transform: isTop ? 'translateY(10px)' : 'translateY(-120%)'
                                                }}
                                            >
                                                <div className={`bg-[var(--card)] backdrop-blur-md border border-[var(--border)] rounded-xl shadow-xl p-3 min-w-[120px] animate-in fade-in zoom-in-95 ${isTop ? 'slide-in-from-top-2' : 'slide-in-from-bottom-2'}`}>
                                                    <div className="text-lg font-black text-[var(--primary)] mb-0.5">
                                                        {p.log.weight}g
                                                    </div>
                                                    <div className="text-[10px] uppercase font-bold text-[var(--muted)]">
                                                        {formatDistanceToNow(new Date(p.log.date), { addSuffix: true, locale })}
                                                    </div>
                                                    <div className="text-[10px] text-[var(--muted)] opacity-70 mt-1">
                                                        {new Date(p.log.date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })()}
                    </div>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 md:gap-6">
                    <StatCard
                        title={t("dashboard.last_fed")}
                        log={stats.lastFed}
                        icon="🦗"
                        type="feeding"
                        delay={0}
                    />
                    <StatCard
                        title={t("dashboard.last_poop")}
                        log={stats.lastPoop}
                        icon="💩"
                        type="poop"
                        delay={100}
                    />
                    <StatCard
                        title={t("dashboard.last_cleaning")}
                        log={stats.lastClean}
                        icon="🧹"
                        type="cleaning"
                        delay={200}
                    />
                </div>

            </div>
        </main>
    );
}
