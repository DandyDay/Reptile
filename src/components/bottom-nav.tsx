"use client";

import { Calendar, Activity, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import { useTranslation } from "@/lib/i18n";

export function BottomNav() {
    const pathname = usePathname();
    const { t } = useTranslation();

    const links = [
        { href: "/", label: t("nav.calendar"), icon: Calendar },
        { href: "/stats", label: t("nav.dashboard"), icon: Activity },
        { href: "/community", label: t("nav.community"), icon: Users },
        { href: "/settings", label: t("nav.manage"), icon: Settings },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--card)] backdrop-blur-lg pb-safe">
            <nav className="mx-auto flex h-16 max-w-md items-center justify-around">
                {links.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 transition-colors",
                                isActive ? "text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            )}
                        >
                            <Icon className={cn("h-6 w-6", isActive && "fill-[var(--primary)] opacity-20")} />
                            <span className="text-[10px] font-medium">{label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
