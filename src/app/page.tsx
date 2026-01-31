"use client";

import { CalendarView } from "@/components/calendar-view";
import { ReptileHeader } from "@/components/reptile-header";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] p-4 text-[var(--foreground)] md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <ReptileHeader />

        {/* Calendar Section */}
        <div className="space-y-4">
          <CalendarView />
        </div>

      </div>
    </main>
  );
}
