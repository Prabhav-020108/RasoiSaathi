"use client";

import React from "react";
import { Volume2, VolumeX, Sparkles, Cpu, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AITier } from "@/lib/ai-provider";
import { getSpeechLocale } from "@/hooks/useVoice";
import type { WaveformMode } from "./Waveform";

interface VoiceStatusProps {
  mode: WaveformMode;
  elapsedSeconds: number;
  lang: string;
  aiTier: AITier;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  interimTranscript?: string;
  error?: string | null;
}

function formatTimer(seconds: number): string {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export function VoiceStatus({
  mode,
  elapsedSeconds,
  lang,
  aiTier,
  autoSpeak,
  onToggleAutoSpeak,
  interimTranscript,
  error,
}: VoiceStatusProps) {
  const statusLabel = (() => {
    if (error && mode === "error") return error;
    if (mode === "listening") {
      return lang === "en"
        ? "Listening... Speak now"
        : lang === "kn"
          ? "ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ... ಮಾತನಾಡಿ"
          : "Sun rahi hoon... Bolein";
    }
    if (mode === "processing") {
      return lang === "en"
        ? "Thinking & updating..."
        : lang === "kn"
          ? "ಪ್ರಕ್ರಿಯೆ ನಡೆಯುತ್ತಿದೆ..."
          : "Samajh rahi hoon...";
    }
    if (mode === "speaking") {
      return lang === "en"
        ? "Speaking..."
        : lang === "kn"
          ? "ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ..."
          : "Bol rahi hoon...";
    }
    return lang === "en"
      ? "Tap mic to speak or type below"
      : lang === "kn"
        ? "ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ"
        : "Bolein ya neeche type karein";
  })();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="default" className="text-[11px]">
            {getSpeechLocale(lang)}
          </Badge>
          {aiTier === "gemini" ? (
            <Badge variant="success" className="text-[11px]">
              <Sparkles className="w-3 h-3" /> Gemini AI
            </Badge>
          ) : aiTier === "local" ? (
            <Badge variant="violet" className="text-[11px]">
              <Cpu className="w-3 h-3" /> Local AI
            </Badge>
          ) : (
            <Badge variant="warning" className="text-[11px]">
              <Zap className="w-3 h-3" /> Basic Mode
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {mode === "listening" && (
            <span className="font-mono text-xs font-bold text-[#7C3AED] bg-violet-100 px-2 py-1 rounded-full">
              {formatTimer(elapsedSeconds)}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleAutoSpeak}
            aria-label={autoSpeak ? "Mute voice replies" : "Enable voice replies"}
            className={`min-h-[36px] min-w-[36px] px-2.5 rounded-full border text-xs font-bold inline-flex items-center gap-1 transition-colors ${
              autoSpeak
                ? "bg-orange-50 border-orange-200 text-[#EA580C]"
                : "bg-stone-100 border-stone-200 text-stone-500"
            }`}
          >
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{autoSpeak ? "Voice On" : "Muted"}</span>
          </button>
        </div>
      </div>

      <p
        className={`text-center text-xs font-semibold px-2 ${
          mode === "error"
            ? "text-[#DC2626]"
            : mode === "listening"
              ? "text-[#7C3AED]"
              : "text-[#78716C]"
        }`}
      >
        {interimTranscript ? `“${interimTranscript}”` : statusLabel}
      </p>
    </div>
  );
}
