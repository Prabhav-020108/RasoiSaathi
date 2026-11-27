"use client";

import React from "react";
import Link from "next/link";
import { Utensils, Flame, Leaf, Droplets, Sparkles, Volume2, Square, Mic } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/components/providers/AppProvider";
import { useVoice } from "@/hooks/useVoice";
import type { TallyBreakdown } from "@/lib/tally";

interface TallyCardProps {
  tally: TallyBreakdown | null;
  loading?: boolean;
}

function buildTallySpeech(tally: TallyBreakdown, lang: string): string {
  const { activeTiffins, dietary, skippedCount, cancelledCount, pausedCount, extraRequests } =
    tally;
  if (activeTiffins === 0 && tally.totalCustomers > 0) {
    if (lang === "en") return "Holiday today! No tiffins to prepare.";
    if (lang === "kn") return "ಇಂದು ರಜೆ! ಯಾವುದೇ ಟಿಫಿನ್ ತಯಾರಿಸಬೇಕಾಗಿಲ್ಲ.";
    return "Aaj chutti hai didi! Koi tiffin nahi banana hai.";
  }

  const extras =
    extraRequests.length > 0
      ? extraRequests.map((r) => `${r.customerName.split(" ")[0]} ${r.items}`).join(", ")
      : "";

  if (lang === "en") {
    return `Today you have ${activeTiffins} tiffins: ${dietary.regular} regular, ${dietary.jain} Jain, ${dietary.lessOil} less-oil, ${dietary.noOnionGarlic} no-onion-garlic. ${skippedCount + cancelledCount} skipped, ${pausedCount} paused.${extras ? ` Extras: ${extras}.` : ""}`;
  }
  if (lang === "kn") {
    return `ಇಂದು ಒಟ್ಟು ${activeTiffins} ಟಿಫಿನ್‌ಗಳಿವೆ: ${dietary.regular} ರೆಗ್ಯುಲರ್, ${dietary.jain} ಜೈನ್, ${dietary.lessOil} ಕಡಿಮೆ ಎಣ್ಣೆ. ${skippedCount + cancelledCount} ಸ್ಕಿಪ್, ${pausedCount} ವಿರಾಮ.`;
  }
  return `Aaj total ${activeTiffins} tiffin banane hain: ${dietary.regular} regular, ${dietary.jain} Jain, ${dietary.lessOil} less-oil, aur ${dietary.noOnionGarlic} bina pyaz lahsun. ${skippedCount + cancelledCount} skip aur ${pausedCount} paused hain.${extras ? ` Extra: ${extras}.` : ""}`;
}

export function TallyCard({ tally, loading }: TallyCardProps) {
  const { dict, lang } = useApp();
  const voice = useVoice({ lang });

  if (loading && !tally) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="space-y-3 animate-pulse">
          <div className="h-5 w-36 rounded-lg bg-orange-100" />
          <div className="h-12 w-28 rounded-xl bg-orange-50" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 rounded-xl bg-stone-100" />
            <div className="h-10 rounded-xl bg-stone-100" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeTiffins = tally?.activeTiffins ?? 0;
  const dietary = tally?.dietary ?? {
    regular: 0,
    jain: 0,
    lessOil: 0,
    noOnionGarlic: 0,
  };
  const skippedOrCancelled = (tally?.skippedCount ?? 0) + (tally?.cancelledCount ?? 0);
  const pausedCount = tally?.pausedCount ?? 0;
  const extraCount = tally?.extraCount ?? 0;

  const handleSpeakTally = () => {
    if (!tally) return;
    if (voice.status === "speaking") {
      voice.stopSpeaking();
      return;
    }
    void voice.speak(buildTallySpeech(tally, lang), lang);
  };

  const askPrompt =
    lang === "en"
      ? "How many tiffins today?"
      : lang === "kn"
        ? "ಇಂದು ಎಷ್ಟು ಟಿಫಿನ್?"
        : "Aaj kitne tiffin banane hain?";

  return (
    <Card className="overflow-hidden border-orange-200/80 bg-gradient-to-br from-white via-white to-orange-50/60">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-9 h-9 rounded-2xl bg-orange-100 text-[#EA580C] flex items-center justify-center shrink-0">
              <Utensils className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#1C1917] truncate">{dict.todayTiffin}</h2>
              <p className="text-xs text-[#78716C]">
                {tally?.totalCustomers ?? 0} subscribers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSpeakTally}
              disabled={!tally}
              aria-label="Speak today's tally aloud"
              className={`min-h-[38px] rounded-full border px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95 ${
                voice.status === "speaking"
                  ? "bg-[#16A34A] text-white border-[#16A34A]"
                  : "bg-orange-50 text-[#EA580C] border-orange-200 hover:bg-orange-100"
              }`}
            >
              {voice.status === "speaking" ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{lang === "en" ? "Speak" : "Sunao"}</span>
                </>
              )}
            </button>

            <Link
              href={`/voice?prompt=${encodeURIComponent(askPrompt)}`}
              className="min-h-[38px] rounded-full bg-[#7C3AED] text-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 shadow-sm hover:bg-violet-700 active:scale-95 transition-transform"
              aria-label="Ask voice assistant about tally"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Ask</span>
            </Link>
          </div>
        </div>

        <div className="mt-4 flex items-baseline gap-2.5">
          <span className="text-5xl font-extrabold tracking-tight text-[#1C1917]">
            {activeTiffins}
          </span>
          <span className="text-base font-bold text-[#78716C]">{dict.total}</span>
        </div>

        {activeTiffins === 0 && (tally?.totalCustomers ?? 0) > 0 && (
          <p className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-[#16A34A]">
            🎉 Aaj chutti! Koi tiffin nahi banana hai.
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-2xl bg-orange-50/90 px-3 py-2.5 border border-orange-100">
            <Flame className="w-4 h-4 text-[#F97316] shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-[#78716C] truncate">{dict.regular}</p>
              <p className="text-base font-extrabold text-[#1C1917]">{dietary.regular}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50/90 px-3 py-2.5 border border-emerald-100">
            <Leaf className="w-4 h-4 text-[#16A34A] shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-[#78716C] truncate">{dict.jain}</p>
              <p className="text-base font-extrabold text-[#1C1917]">{dietary.jain}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-amber-50/90 px-3 py-2.5 border border-amber-100">
            <Droplets className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-[#78716C] truncate">{dict.lessOil}</p>
              <p className="text-base font-extrabold text-[#1C1917]">{dietary.lessOil}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-violet-50/90 px-3 py-2.5 border border-violet-100">
            <Sparkles className="w-4 h-4 text-[#7C3AED] shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-[#78716C] truncate">{dict.noOnionGarlic}</p>
              <p className="text-base font-extrabold text-[#1C1917]">
                {dietary.noOnionGarlic}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2 pt-3 border-t border-orange-100">
          <Badge variant="danger">
            🔴 {skippedOrCancelled} {dict.skipped}
          </Badge>
          <Badge variant="warning">
            ⏸️ {pausedCount} {dict.paused}
          </Badge>
          <Badge variant="success">
            🟢 {extraCount} {dict.extra}
          </Badge>
        </div>

        {tally?.extraRequests && tally.extraRequests.length > 0 && (
          <div className="mt-2.5 rounded-2xl bg-green-50/80 border border-green-100 px-3 py-2 text-xs text-green-900">
            <span className="font-bold">Extra: </span>
            {tally.extraRequests
              .map((r) => `${r.customerName.split(" ")[0]} (${r.items})`)
              .join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
