"use client";

import React from "react";
import Link from "next/link";
import { Bell, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/components/providers/AppProvider";

export interface RecentUpdateItem {
  id: string;
  senderName: string;
  intent: string | null;
  status: string;
  originalText: string;
  translatedText: string | null;
}

export function RecentUpdates({ updates }: { updates: RecentUpdateItem[] }) {
  const { dict } = useApp();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-orange-100 text-[#F97316] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-[#1C1917]">{dict.recentUpdates}</h3>
          </div>
          <Link
            href="/messages"
            className="text-xs font-bold text-[#7C3AED] inline-flex items-center gap-1 hover:underline py-1"
          >
            Inbox <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {updates.length === 0 ? (
          <p className="text-sm text-[#78716C] py-2">No recent updates yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {updates.slice(0, 4).map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-2xl bg-orange-50/50 px-3 py-2.5 border border-orange-100/70"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#1C1917]">
                    {item.senderName}
                  </p>
                  <p className="text-xs text-[#78716C] truncate mt-0.5">
                    &ldquo;{item.translatedText || item.originalText}&rdquo;
                  </p>
                </div>
                <Badge
                  variant={item.status === "processed" ? "success" : "info"}
                  className="shrink-0 capitalize"
                >
                  {item.intent || item.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
