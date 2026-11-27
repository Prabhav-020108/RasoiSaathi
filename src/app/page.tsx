"use client";

import React from "react";
import useSWR from "swr";
import { AlertTriangle, Cpu, KeyRound, SkipForward } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { TallyCard } from "@/components/dashboard/TallyCard";
import { PendingPaymentCard } from "@/components/dashboard/PendingPaymentCard";
import { RecentUpdates, type RecentUpdateItem } from "@/components/dashboard/RecentUpdates";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/components/providers/AppProvider";
import type { TallyBreakdown } from "@/lib/tally";

interface TallyResponse extends TallyBreakdown {
  newMessagesCount: number;
  recentUpdates: RecentUpdateItem[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load tally");
  return res.json();
};

export default function DashboardPage() {
  const { needsAISetup, setAISetupOpen, chooseBasicMode, dict } = useApp();
  const { data, isLoading } = useSWR<TallyResponse>("/api/tally", fetcher, {
    refreshInterval: 15000,
  });

  return (
    <div className="min-h-full">
      <Header showGreeting />

      <div className="px-4 space-y-4 pb-4">
        {needsAISetup && (
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 via-white to-violet-50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[#1C1917]">
                    {dict.aiBanner.notConfiguredTitle}
                  </h2>
                  <p className="text-xs text-[#78716C] mt-0.5 leading-relaxed">
                    {dict.aiBanner.notConfiguredDesc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setAISetupOpen(true)}
                  className="min-h-[42px] rounded-xl bg-[#7C3AED] text-white px-2 py-1.5 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <Cpu className="w-3.5 h-3.5 shrink-0" />
                  <span>Local AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAISetupOpen(true)}
                  className="min-h-[42px] rounded-xl bg-[#F97316] text-white px-2 py-1.5 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <KeyRound className="w-3.5 h-3.5 shrink-0" />
                  <span>API Key</span>
                </button>
                <button
                  type="button"
                  onClick={chooseBasicMode}
                  className="min-h-[42px] rounded-xl bg-stone-100 text-stone-700 border border-stone-200 px-2 py-1.5 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <SkipForward className="w-3.5 h-3.5 shrink-0" />
                  <span>Basic</span>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        <TallyCard tally={data ?? null} loading={isLoading} />

        <PendingPaymentCard
          pendingTotal={data?.pendingPaymentsTotal ?? 0}
          pendingCount={data?.pendingPaymentsCount ?? 0}
          newMessagesCount={data?.newMessagesCount ?? 0}
        />

        <QuickActions />

        <RecentUpdates updates={data?.recentUpdates ?? []} />
      </div>
    </div>
  );
}
