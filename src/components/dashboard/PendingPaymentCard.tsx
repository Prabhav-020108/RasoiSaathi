"use client";

import React from "react";
import Link from "next/link";
import { IndianRupee, MessageCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/components/providers/AppProvider";
import { formatINR } from "@/lib/utils";

interface SummaryRowProps {
  pendingTotal: number;
  pendingCount: number;
  newMessagesCount: number;
}

export function PendingPaymentCard({
  pendingTotal,
  pendingCount,
  newMessagesCount,
}: SummaryRowProps) {
  const { dict } = useApp();

  return (
    <div className="grid grid-cols-2 gap-3">
      <Link href="/payments" className="block group">
        <Card className="h-full transition-transform group-active:scale-[0.98] hover:border-red-200">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="w-9 h-9 rounded-2xl bg-red-100 text-[#DC2626] flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </span>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>
            <div className="mt-3">
              <p className="text-xl font-extrabold text-[#1C1917]">
                {formatINR(pendingTotal)}
              </p>
              <p className="text-xs font-semibold text-[#DC2626] mt-0.5">
                {dict.pending} ({pendingCount})
              </p>
            </div>
          </CardContent>
        </Card>
      </Link>

      <Link href="/messages" className="block group">
        <Card className="h-full transition-transform group-active:scale-[0.98] hover:border-violet-200">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="w-9 h-9 rounded-2xl bg-violet-100 text-[#7C3AED] flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </span>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>
            <div className="mt-3">
              <p className="text-xl font-extrabold text-[#1C1917]">
                {newMessagesCount} New
              </p>
              <p className="text-xs font-semibold text-[#7C3AED] mt-0.5">
                {dict.newMessages}
              </p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
