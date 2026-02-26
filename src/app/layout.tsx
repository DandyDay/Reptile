import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Reptile Tracker",
  description: "Advanced care tracking for your reptiles",
};

import { BottomNav } from "@/components/bottom-nav";
import { ReptileProvider } from "@/lib/store";
import { GamificationProvider } from "@/lib/gamification-store";
import { XPToast } from "@/components/gamification/xp-toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[var(--background)] text-[var(--foreground)] pb-20 transition-colors duration-300`}>
        <ReptileProvider>
          <GamificationProvider>
            {children}
            <BottomNav />
            <XPToast />
          </GamificationProvider>
        </ReptileProvider>
      </body>
    </html>
  );
}
