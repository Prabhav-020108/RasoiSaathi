"use client";

import React from "react";
import useSWR from "swr";
import { UtensilsCrossed, Globe } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CustomerListItem } from "@/components/customers/CustomerCard";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
};

export default function MenuPage() {
  const { data } = useSWR<{ customers: CustomerListItem[] }>("/api/customers", fetcher);

  const activeCustomers = (data?.customers ?? []).filter((c) => c.status === "active");
  const langCounts = activeCustomers.reduce<Record<string, number>>((acc, c) => {
    acc[c.language] = (acc[c.language] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-full">
      <Header title="📋 Menu Broadcast" subtitle="Dictate once, translate for all" />

      <div className="px-4 space-y-4 pb-4">
        <Card className="border-orange-200 bg-gradient-to-br from-white to-orange-50/60">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl bg-orange-100 text-[#F97316] flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[#1C1917]">
                  Tomorrow&apos;s Menu Broadcast
                </h2>
                <p className="text-xs text-[#78716C]">
                  Full voice dictation &amp; multilingual broadcast launches in Day 3
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-orange-100 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#7C3AED]">
                <Globe className="w-4 h-4" />
                Active Subscriber Languages ({activeCustomers.length} customers)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(langCounts).map(([code, count]) => (
                  <Badge key={code} variant="saffron">
                    {code.toUpperCase()}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
