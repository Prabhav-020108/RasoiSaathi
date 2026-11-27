"use client";

import React from "react";
import Link from "next/link";
import { Pause, Play, ChevronRight, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR, getDietaryLabel, getLanguageLabel } from "@/lib/utils";

export interface CustomerListItem {
  id: string;
  name: string;
  phone: string | null;
  language: string;
  dietaryPref: string;
  monthlyPrice: number;
  status: string;
  pauseUntil: string | null;
  specialNotes: string | null;
  currentPayment: {
    id: string;
    status: string;
    amount: number;
    paidAmount: number;
  } | null;
  todayOrder: {
    id: string;
    status: string;
    extraItems: string | null;
  } | null;
}

interface CustomerCardProps {
  customer: CustomerListItem;
  onTogglePause: (customer: CustomerListItem) => void;
  updatingId?: string | null;
}

export function CustomerCard({
  customer,
  onTogglePause,
  updatingId,
}: CustomerCardProps) {
  const statusDot =
    customer.status === "active"
      ? "bg-[#16A34A]"
      : customer.status === "paused"
        ? "bg-[#EAB308]"
        : "bg-[#DC2626]";

  const isPaid = customer.currentPayment?.status === "paid";
  const pendingAmt = customer.currentPayment
    ? Math.max(0, customer.currentPayment.amount - customer.currentPayment.paidAmount)
    : customer.monthlyPrice;

  return (
    <Card className="transition-colors hover:border-orange-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/customers/${customer.id}`} className="min-w-0 flex-1 group">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot}`} />
              <h3 className="font-bold text-base text-[#1C1917] truncate group-hover:text-[#EA580C]">
                {customer.name}
              </h3>
              <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-[#78716C]">
              <span className="font-semibold text-[#1C1917]">
                {getDietaryLabel(customer.dietaryPref)}
              </span>
              <span>•</span>
              <span className="font-bold text-[#EA580C]">
                {formatINR(customer.monthlyPrice)}/mo
              </span>
              <span>•</span>
              <span>{getLanguageLabel(customer.language).split(" ")[0]}</span>
            </div>
          </Link>

          {customer.status !== "cancelled" && (
            <button
              type="button"
              disabled={updatingId === customer.id}
              onClick={() => onTogglePause(customer)}
              aria-label={customer.status === "paused" ? "Resume customer" : "Pause customer"}
              className="min-w-[48px] min-h-[48px] rounded-2xl border border-stone-200 bg-stone-50 hover:bg-orange-50 flex items-center justify-center text-stone-700 shrink-0 active:scale-95 transition-all disabled:opacity-50"
            >
              {customer.status === "paused" ? (
                <Play className="w-4 h-4 text-[#16A34A]" />
              ) : (
                <Pause className="w-4 h-4 text-amber-600" />
              )}
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-stone-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {customer.status === "paused" ? (
              <Badge variant="warning">⏸️ Paused</Badge>
            ) : customer.status === "cancelled" ? (
              <Badge variant="danger">Cancelled</Badge>
            ) : isPaid ? (
              <Badge variant="success">💰 Paid ✅</Badge>
            ) : (
              <Badge variant="danger">💰 Pending {formatINR(pendingAmt)}</Badge>
            )}

            {customer.todayOrder?.status === "skipped" && (
              <Badge variant="default">Skipped today</Badge>
            )}
            {customer.todayOrder?.extraItems && (
              <Badge variant="violet">+ {customer.todayOrder.extraItems}</Badge>
            )}
          </div>

          {customer.phone && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#78716C]">
              <Phone className="w-3 h-3" />
              {customer.phone}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
