"use client";

import React, { useEffect, useRef } from "react";
import { CheckCircle2, Sparkles, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AITier } from "@/lib/ai-provider";
import type { TallyBreakdown } from "@/lib/tally";
import { formatINR } from "@/lib/utils";

export interface VoiceChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  timestamp: string;
  intent?: string;
  tierUsed?: AITier;
  actionPerformed?: boolean;
  actionSummary?: string;
  needsDisambiguation?: boolean;
  candidates?: Array<{ id: string; name: string; phoneLast4: string }>;
  tally?: TallyBreakdown | null;
  pendingCustomers?: Array<{ name: string; remaining: number }>;
}

interface VoiceChatProps {
  messages: VoiceChatMessage[];
  onReplay: (text: string) => void;
  onSelectCandidate: (candidateName: string, phoneLast4: string) => void;
}

export function VoiceChat({
  messages,
  onReplay,
  onSelectCandidate,
}: VoiceChatProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
              m.role === "user"
                ? "bg-[#EDE9FE] text-[#1C1917] rounded-br-md"
                : "bg-white border border-orange-100 text-[#1C1917] rounded-bl-md"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5 shrink-0">
                {m.role === "user" ? "👩‍🍳" : "🤖"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap">{m.text}</p>

                {m.actionPerformed && m.actionSummary && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-bold text-[#16A34A]">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{m.actionSummary}</span>
                  </div>
                )}

                {m.intent === "tally" && m.tally && (
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
                    <div className="rounded-xl bg-orange-50 border border-orange-100 px-2 py-1.5">
                      <p className="text-[10px] text-[#78716C] font-semibold">Total</p>
                      <p className="text-sm font-extrabold text-[#1C1917]">
                        {m.tally.activeTiffins}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-2 py-1.5">
                      <p className="text-[10px] text-[#78716C] font-semibold">Jain</p>
                      <p className="text-sm font-extrabold text-[#1C1917]">
                        {m.tally.dietary.jain}
                      </p>
                    </div>
                    <div className="rounded-xl bg-red-50 border border-red-100 px-2 py-1.5">
                      <p className="text-[10px] text-[#78716C] font-semibold">Skip</p>
                      <p className="text-sm font-extrabold text-[#1C1917]">
                        {m.tally.skippedCount + m.tally.cancelledCount}
                      </p>
                    </div>
                  </div>
                )}

                {m.pendingCustomers && m.pendingCustomers.length > 0 && (
                  <div className="mt-2.5 space-y-1 rounded-2xl bg-red-50/60 border border-red-100 p-2.5">
                    {m.pendingCustomers.slice(0, 5).map((p, i) => (
                      <div
                        key={`${p.name}-${i}`}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-[#1C1917]">{p.name}</span>
                        <span className="font-bold text-[#DC2626]">
                          {formatINR(p.remaining)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {m.needsDisambiguation && m.candidates && m.candidates.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.candidates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onSelectCandidate(c.name, c.phoneLast4)}
                        className="rounded-full bg-violet-50 border border-violet-200 px-3 py-1.5 text-xs font-bold text-[#7C3AED] hover:bg-violet-100 active:scale-95 transition-transform"
                      >
                        {c.name} {c.phoneLast4 ? `(${c.phoneLast4})` : ""}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {m.intent && m.intent !== "unknown" && (
                      <Badge variant="violet" className="text-[10px]">
                        <Sparkles className="w-2.5 h-2.5" /> {m.intent}
                      </Badge>
                    )}
                    {m.tierUsed && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#78716C]">
                        {m.tierUsed}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {m.role === "assistant" && (
                      <button
                        type="button"
                        onClick={() => onReplay(m.text)}
                        aria-label="Speak response aloud"
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-[#EA580C] hover:bg-orange-50 active:scale-95"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="text-[10px] text-[#78716C]">{m.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
