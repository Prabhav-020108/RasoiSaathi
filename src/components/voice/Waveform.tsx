"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type WaveformMode = "idle" | "listening" | "processing" | "speaking" | "error";

const BAR_HEIGHTS = [24, 42, 68, 86, 54, 96, 72, 48, 88, 62, 92, 50, 76, 58, 38, 22];

export function Waveform({
  mode,
  activeActivity = false,
}: {
  mode: WaveformMode;
  activeActivity?: boolean;
}) {
  const isAnimating = mode === "listening" || mode === "speaking" || mode === "processing";

  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center gap-1 h-12 px-3"
    >
      {BAR_HEIGHTS.map((heightPct, idx) => {
        const delayMs = (idx % 6) * 110;
        const barColor =
          mode === "error"
            ? "bg-red-400"
            : mode === "listening"
              ? "bg-gradient-to-t from-[#7C3AED] to-[#F97316]"
              : mode === "speaking"
                ? "bg-gradient-to-t from-[#16A34A] to-[#7C3AED]"
                : mode === "processing"
                  ? "bg-amber-400"
                  : "bg-stone-300";

        const dynamicHeight =
          mode === "idle"
            ? 24 + (idx % 3) * 10
            : mode === "error"
              ? 28
              : activeActivity
                ? Math.min(100, heightPct + 10)
                : heightPct;

        return (
          <span
            key={idx}
            className={cn(
              "w-1.5 rounded-full transition-all duration-200",
              barColor,
              isAnimating && "animate-voice-wave"
            )}
            style={{
              height: `${dynamicHeight}%`,
              animationDelay: `${delayMs}ms`,
              animationDuration:
                mode === "listening"
                  ? "0.65s"
                  : mode === "speaking"
                    ? "0.85s"
                    : "1.2s",
            }}
          />
        );
      })}
    </div>
  );
}
