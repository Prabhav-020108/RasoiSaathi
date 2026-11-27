"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { isVoiceShortcut } from "@/lib/voice-shortcuts";

export function MicButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { dict } = useApp();

  useEffect(() => {
    if (pathname === "/voice") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isVoiceShortcut(event, "m")) return;
      event.preventDefault();
      router.push("/voice?listen=1");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, router]);

  if (pathname === "/voice") {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-[72px] left-0 right-0 flex flex-col items-center z-40">
      <Link
        href="/voice?listen=1"
        aria-label={dict.talkToRasoiSaathi}
        aria-keyshortcuts="M"
        title="Talk to RasoiSaathi (M)"
        className="pointer-events-auto group flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#F97316] text-white shadow-mic animate-mic-pulse hover:scale-105 active:scale-95 transition-transform border-4 border-white"
      >
        <Mic className="w-7 h-7 stroke-[2.4]" />
      </Link>
      <span className="mt-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-[#7C3AED] shadow-sm border border-violet-100">
        {dict.tapMicHint} · M
      </span>
    </div>
  );
}
