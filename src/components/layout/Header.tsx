"use client";

import React from "react";
import { Globe, Sparkles, Cpu, Zap, AlertTriangle } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { SUPPORTED_LANGUAGES, formatReadableDate } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showGreeting?: boolean;
  rightSlot?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  showGreeting = false,
  rightSlot,
}: HeaderProps) {
  const { cook, lang, setLang, dict, aiTier, needsAISetup, setAISetupOpen } = useApp();

  const cookFirstName = cook?.name ? cook.name.split(" ")[0] : "Sunita";
  const greetingText = dict.didi
    ? `${dict.greeting}, ${cookFirstName} ${dict.didi}!`
    : `${dict.greeting}, ${cookFirstName}!`;

  const todayFormatted = formatReadableDate(new Date(), lang);

  const aiBadge = needsAISetup
    ? {
        label: "No AI Key",
        icon: AlertTriangle,
        cls: "bg-amber-100 text-amber-800 border-amber-200",
      }
    : aiTier === "gemini"
      ? {
          label: "Gemini AI",
          icon: Sparkles,
          cls: "bg-green-100 text-[#16A34A] border-green-200",
        }
      : aiTier === "local"
        ? {
            label: "Local AI",
            icon: Cpu,
            cls: "bg-violet-100 text-[#7C3AED] border-violet-200",
          }
        : {
            label: "Basic Mode",
            icon: Zap,
            cls: "bg-stone-100 text-stone-700 border-stone-200",
          };

  const AIIcon = aiBadge.icon;

  return (
    <header className="px-4 pt-4 pb-3 bg-gradient-to-b from-orange-100/80 via-[#FFF7ED] to-transparent">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {showGreeting ? (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white text-base shadow-sm shrink-0">
                  🍳
                </span>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#1C1917] truncate">
                  {greetingText}
                </h1>
              </div>
              <p className="mt-1 text-xs font-medium text-[#78716C] pl-10">
                {todayFormatted}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#1C1917] truncate">
                {title || dict.appName}
              </h1>
              {subtitle && (
                <p className="text-xs font-medium text-[#78716C] mt-0.5">{subtitle}</p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {rightSlot}
          <button
            type="button"
            onClick={() => setAISetupOpen(true)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition-transform active:scale-95 min-h-[40px] ${aiBadge.cls}`}
            title="AI Provider Status"
          >
            <AIIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">{aiBadge.label}</span>
          </button>

          <label className="relative inline-flex items-center">
            <span className="sr-only">Select Language</span>
            <Globe className="w-3.5 h-3.5 text-[#78716C] absolute left-2.5 pointer-events-none" />
            <select
              value={lang}
              onChange={(e) => void setLang(e.target.value)}
              aria-label="Language"
              className="min-h-[40px] appearance-none rounded-full border border-orange-200 bg-white pl-7 pr-5 py-1 text-xs font-bold text-[#1C1917] shadow-sm focus:border-[#F97316] focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.code.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  );
}
