"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import {
  UtensilsCrossed,
  Globe,
  Mic,
  MicOff,
  Sparkles,
  Copy,
  Check,
  Send,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/AppProvider";
import { useVoice } from "@/hooks/useVoice";
import type { CustomerListItem } from "@/components/customers/CustomerCard";

interface BroadcastItem {
  id: string;
  date: string;
  menuText: string;
  translations: Record<string, string>;
  jainNote: string | null;
  sentAt: string | null;
  createdAt: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
};

const JAIN_NOTE_TEXT = "Jain version: without onion-garlic, with extra paneer";

export default function MenuPage() {
  const { dict, lang, showToast } = useApp();
  const { data: custData } = useSWR<{ customers: CustomerListItem[] }>("/api/customers", fetcher);
  const {
    data: broadcastData,
    error: broadcastError,
    isLoading: broadcastsLoading,
    mutate: mutateBroadcasts,
  } = useSWR<{ broadcasts: BroadcastItem[] }>("/api/menu/broadcast", fetcher);

  const [menuText, setMenuText] = useState("");
  const [includeJainNote, setIncludeJainNote] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [markingSentId, setMarkingSentId] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<BroadcastItem | null>(null);
  const [copiedLang, setCopiedLang] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { status: voiceStatus, startListening, stopListening } = useVoice({
    lang,
    onFinalTranscript: (spoken) => {
      setMenuText((prev) => (prev.trim() ? `${prev.trim()}, ${spoken}` : spoken));
    },
  });

  const tomorrowFormatted = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  const activeCustomers = (custData?.customers ?? []).filter((c) => c.status === "active");
  const langCounts = activeCustomers.reduce<Record<string, number>>((acc, c) => {
    acc[c.language] = (acc[c.language] ?? 0) + 1;
    return acc;
  }, {});

  const handleToggleVoice = () => {
    if (voiceStatus === "listening") {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleTranslateAndPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuText.trim()) {
      setSubmitError("Please enter or dictate tomorrow's menu first.");
      return;
    }
    setSubmitError(null);
    setTranslating(true);
    try {
      const res = await fetch("/api/menu/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          menuText: menuText.trim(),
          jainNote: includeJainNote ? JAIN_NOTE_TEXT : undefined,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to generate menu preview");
      }
      const result = (await res.json()) as { broadcast: BroadcastItem };
      setActivePreview(result.broadcast);
      await mutateBroadcasts();
      showToast("Menu translated & ready to share!", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to translate menu";
      setSubmitError(msg);
      showToast(msg, "error");
    } finally {
      setTranslating(false);
    }
  };

  const handleCopy = async (code: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLang(code);
      showToast(`${code.toUpperCase()} ${dict.menu.copied}`, "success");
      setTimeout(() => setCopiedLang((prev) => (prev === code ? null : prev)), 2000);
    } catch {
      showToast("Could not copy to clipboard", "error");
    }
  };

  const handleMarkSent = async (id: string) => {
    setMarkingSentId(id);
    try {
      const res = await fetch(`/api/menu/broadcast/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to mark as sent");
      const updated = (await res.json()) as { broadcast: BroadcastItem };
      if (activePreview?.id === id) {
        setActivePreview(updated.broadcast);
      }
      await mutateBroadcasts();
      showToast("Marked as sent!", "success");
    } catch {
      showToast("Failed to mark broadcast as sent", "error");
    } finally {
      setMarkingSentId(null);
    }
  };

  const pastBroadcasts = broadcastData?.broadcasts ?? [];

  return (
    <div className="min-h-full">
      <Header title={`📋 ${dict.menu.title}`} subtitle={dict.menu.subtitle} />

      <div className="px-4 space-y-4 pb-6">
        {/* Menu Input Card */}
        <Card className="border-orange-200 bg-gradient-to-br from-white to-orange-50/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-orange-100 text-[#F97316] flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#1C1917]">{dict.menu.menuText}</h2>
                  <p className="text-xs text-[#78716C]">
                    {dict.menu.broadcastFor}: Tomorrow ({tomorrowFormatted})
                  </p>
                </div>
              </div>
            </div>

            {/* Active Subscriber Languages */}
            <div className="rounded-2xl bg-white border border-orange-100 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#7C3AED]">
                <Globe className="w-4 h-4" />
                Active Languages ({activeCustomers.length} customers)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(langCounts).map(([code, count]) => (
                  <Badge key={code} variant="saffron">
                    {code.toUpperCase()}: {count}
                  </Badge>
                ))}
              </div>
            </div>

            <form onSubmit={handleTranslateAndPreview} className="space-y-3">
              <div className="relative">
                <textarea
                  value={menuText}
                  onChange={(e) => setMenuText(e.target.value)}
                  rows={3}
                  placeholder="Dal tadka, jeera rice, aloo sabzi, salad, papad"
                  aria-label={dict.menu.menuText}
                  className="w-full rounded-2xl border border-stone-200 bg-white p-3.5 pr-14 text-sm text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  aria-label={
                    voiceStatus === "listening" ? "Stop voice dictation" : "Dictate menu by voice"
                  }
                  className={`absolute right-2.5 top-2.5 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    voiceStatus === "listening"
                      ? "bg-[#DC2626] text-white animate-pulse"
                      : "bg-violet-100 text-[#7C3AED] hover:bg-violet-200"
                  }`}
                >
                  {voiceStatus === "listening" ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Jain Note Toggle */}
              <button
                type="button"
                onClick={() => setIncludeJainNote((prev) => !prev)}
                aria-label={dict.menu.jainNote}
                aria-pressed={includeJainNote}
                className={`w-full min-h-[48px] rounded-2xl border px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                  includeJainNote
                    ? "bg-green-50 border-green-300 text-[#16A34A]"
                    : "bg-white border-stone-200 text-[#78716C]"
                }`}
              >
                <span>🥗 {dict.menu.jainNote}</span>
                <Badge variant={includeJainNote ? "success" : "default"}>
                  {includeJainNote ? "ON" : "OFF"}
                </Badge>
              </button>

              {includeJainNote && (
                <p className="text-[11px] text-[#16A34A] px-1">+ {JAIN_NOTE_TEXT}</p>
              )}

              {submitError && (
                <div
                  role="alert"
                  className="rounded-2xl bg-red-50 border border-red-200 p-2.5 text-xs text-red-800 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={translating}
                aria-label={dict.menu.translateAndPreview}
                className="w-full min-h-[48px]"
              >
                {translating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{dict.menu.translating}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{dict.menu.translateAndPreview}</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* WhatsApp Preview Bubbles */}
        {activePreview && (
          <Card className="border-emerald-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#1C1917]">WhatsApp Preview</h3>
                {activePreview.sentAt ? (
                  <Badge variant="success">Sent</Badge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={markingSentId === activePreview.id}
                    onClick={() => handleMarkSent(activePreview.id)}
                    aria-label="Mark broadcast as sent"
                    className="min-h-[48px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Mark Sent</span>
                  </Button>
                )}
              </div>

              <div className="space-y-2.5">
                {Object.entries(activePreview.translations).map(([code, text]) => (
                  <div
                    key={code}
                    className="rounded-2xl rounded-tl-sm bg-emerald-50 border border-emerald-200 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="saffron" className="uppercase text-[10px]">
                        {code}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleCopy(code, text)}
                        aria-label={`${dict.menu.copyText} ${code.toUpperCase()} menu`}
                        className="min-h-[48px] px-3 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-[#16A34A] flex items-center gap-1.5 hover:bg-emerald-100/50"
                      >
                        {copiedLang === code ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{dict.menu.copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{dict.menu.copyText}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-[#1C1917] whitespace-pre-line">{text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Past Broadcasts */}
        <div className="space-y-2.5">
          <h3 className="text-sm font-bold text-[#1C1917] px-1">{dict.menu.pastBroadcasts}</h3>

          {broadcastError && (
            <div
              role="alert"
              className="rounded-2xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Failed to load past broadcasts.</span>
            </div>
          )}

          {broadcastsLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-20 rounded-3xl bg-white animate-pulse border border-stone-100"
                />
              ))}
            </div>
          ) : pastBroadcasts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <div className="text-3xl">📋</div>
                <p className="text-sm font-semibold text-[#78716C]">
                  📋 No past menus. Create your first broadcast!
                </p>
              </CardContent>
            </Card>
          ) : (
            pastBroadcasts.map((b) => (
              <Card
                key={b.id}
                className="cursor-pointer hover:border-violet-200 transition-colors"
                onClick={() => setActivePreview(b)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs font-bold text-[#78716C]">
                      {new Date(b.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <p className="text-sm text-[#1C1917] truncate">
                      {b.menuText.slice(0, 80)}
                    </p>
                  </div>
                  <Badge variant={b.sentAt ? "success" : "default"} className="shrink-0">
                    {b.sentAt ? "Sent" : "Draft"}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
