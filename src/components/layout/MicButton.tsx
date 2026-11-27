"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";

export function MicButton() {
  const pathname = usePathname();
  const { dict } = useApp();

  if (pathname === "/voice") {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-[72px] left-0 right-0 flex flex-col items-center z-40">
      <Link
        href="/voice?listen=1"
        aria-label={dict.talkToRasoiSaathi}
        className="pointer-events-auto group flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#F97316] text-white shadow-mic animate-mic-pulse hover:scale-105 active:scale-95 transition-transform border-4 border-white"
      >
        <Mic className="w-7 h-7 stroke-[2.4]" />
      </Link>
      <span className="mt-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-[#7C3AED] shadow-sm border border-violet-100">
        {dict.tapMicHint}
      </span>
    </div>
  );
}
