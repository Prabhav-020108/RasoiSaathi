"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { MicButton } from "./MicButton";
import { AISetupModal } from "@/components/ai/AISetupModal";

export function PhoneShell({ children }: { children: React.ReactNode }) {
  const isVoicePage = usePathname() === "/voice";
  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-[#FFF7ED] lg:bg-gradient-to-br lg:from-orange-100/70 lg:via-stone-100 lg:to-violet-100/70 lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-6 lg:py-4">
      <div className="relative flex flex-col w-full h-full sm:max-w-[540px] sm:mx-auto lg:w-[420px] lg:h-[844px] lg:max-h-[calc(100dvh-5rem)] bg-[#FFF7ED] lg:rounded-[44px] lg:border-[10px] lg:border-stone-900 lg:shadow-phone overflow-hidden">
        {/* Subtle desktop phone speaker notch */}
        <div className="hidden lg:flex items-center justify-center pt-2.5 pb-1 bg-orange-100/70 shrink-0">
          <div className="w-20 h-1.5 rounded-full bg-stone-900/20" />
        </div>

        {/* Scrollable screen body */}
        <main className={`flex-1 min-h-0 overflow-y-auto phone-scroll ${isVoicePage ? "pb-20" : "pb-28"}`}>
          {children}
        </main>

        {/* Floating always-visible Voice Mic CTA */}
        <MicButton />

        {/* Fixed 5-tab thumb-reachable bottom nav */}
        <BottomNav />
      </div>

      <p className="hidden lg:block mt-3 text-xs font-medium text-stone-500">
        🍳 RasoiSaathi • Mobile-First Voice PWA Preview
      </p>

      <AISetupModal />
    </div>
  );
}
