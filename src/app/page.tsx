"use client";

import { useState, useEffect } from "react";
import { CalendarView } from "@/components/calendar-view";
import { ReptileHeader } from "@/components/reptile-header";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { useReptileLogs } from "@/lib/store";

export default function Home() {
  const { reptiles, isLoaded } = useReptileLogs();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isLoaded && reptiles.length === 0) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [isLoaded, reptiles.length]);

  return (
    <main className="min-h-screen bg-[var(--background)] p-4 text-[var(--foreground)] md:p-8">
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}

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
