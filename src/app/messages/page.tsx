"use client";

import React from "react";
import useSWR from "swr";
import { MessageCircle, Languages } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MessageItem {
  id: string;
  senderName: string;
  originalText: string;
  originalLang: string;
  translatedText: string | null;
  translatedLang: string | null;
  intent: string | null;
  status: string;
  autoReply: string | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load messages");
  return res.json();
};

export default function MessagesPage() {
  const { data, isLoading } = useSWR<{
    counts: { total: number; new: number; processed: number };
    messages: MessageItem[];
  }>("/api/messages", fetcher);

  return (
    <div className="min-h-full">
      <Header
        title="📱 WhatsApp Inbox"
        subtitle={`${data?.counts.new ?? 0} new • Simulated feed`}
      />

      <div className="px-4 space-y-3 pb-4">
        <div className="rounded-2xl bg-violet-50 border border-violet-200 p-3 text-xs text-violet-900">
          Simulated customer messages pre-loaded from SQLite. Interactive AI processing &amp; message simulator will be wired in Day 3.
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 rounded-3xl bg-white animate-pulse" />
            ))}
          </div>
        ) : (
          (data?.messages ?? []).map((msg) => (
            <Card key={msg.id}>
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#7C3AED]" />
                    <span className="font-bold text-sm text-[#1C1917]">
                      {msg.senderName}
                    </span>
                    <Badge variant="default" className="uppercase text-[10px]">
                      {msg.originalLang}
                    </Badge>
                  </div>
                  <Badge variant={msg.status === "processed" ? "success" : "info"}>
                    {msg.status}
                  </Badge>
                </div>

                <p className="text-sm text-[#1C1917] bg-stone-50 rounded-2xl p-3 border border-stone-100">
                  &ldquo;{msg.originalText}&rdquo;
                </p>

                {msg.translatedText && (
                  <div className="flex items-start gap-2 rounded-2xl bg-orange-50/70 p-2.5 border border-orange-100 text-xs text-stone-700">
                    <Languages className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                    <span>{msg.translatedText}</span>
                  </div>
                )}

                {msg.autoReply && (
                  <p className="text-xs font-semibold text-[#16A34A]">
                    Auto-reply: {msg.autoReply}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
