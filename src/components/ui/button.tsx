import { cn } from "@/lib/utils";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg" | "icon";
}

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
    const variants = {
        primary: "bg-[var(--primary)] text-white hover:opacity-90 shadow-lg shadow-[var(--primary)]/20",
        secondary: "glass-button text-[var(--foreground)]",
        ghost: "hover:bg-slate-500/10 text-[var(--muted)] hover:text-[var(--foreground)]",
        danger: "bg-[var(--destructive)] text-white hover:opacity-90",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2.5 text-sm",
        lg: "px-6 py-3 text-base",
        icon: "h-10 w-10 p-0",
    };

    return (
        <button
            className={cn(
                "inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    );
}
