"use client";

import React, { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import {
  MessageCircle,
  Languages,
  Send,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/components/providers/AppProvider";
import { SUPPORTED_LANGUAGES } from "@/lib/utils";
import { inboxAction, readInboxMessage, type InboxMessage } from "@/lib/inbox-client";
import { kitchenCopy } from "@/lib/kitchen-language";

interface MessageItem extends InboxMessage {
  intent: string | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load messages");
  return res.json();
};

export default function MessagesPage() {
  const { dict, aiTier, lang, showToast } = useApp();
  const { data, error, isLoading, mutate } = useSWR<{
    counts: { total: number; new: number; processed: number };
    messages: MessageItem[];
  }>("/api/messages", fetcher);

  const [senderName, setSenderName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [originalLang, setOriginalLang] = useState("hi");
  const [sending, setSending] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [actionSummaries, setActionSummaries] = useState<Record<string, string>>({});

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSimulateSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !messageText.trim()) {
      setActionError("Please enter both sender name and message text.");
      return;
    }
    setActionError(null);
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: senderName.trim(),
          originalText: messageText.trim(),
          originalLang,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to send message");
      }
      setSenderName("");
      setMessageText("");
      await mutate();
      showToast("Simulated WhatsApp message added!", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send message";
      setActionError(msg);
      showToast(msg, "error");
    } finally {
      setSending(false);
    }
  };

  const handleProcessMessage = async (msg: MessageItem, action: "read" | "approve" | "approveReply") => {
    setActionError(null);
    setProcessingId(msg.id);
    try {
      const result = action === "read" ? await readInboxMessage(msg, lang, aiTier)
        : await inboxAction(msg.id, action, action === "approve" ? { proposal: msg.proposal } : {});
      if (result.actionSummary) {
        setActionSummaries((prev) => ({ ...prev, [msg.id]: result.actionSummary! }));
      }
      setExpandedIds((prev) => ({ ...prev, [msg.id]: true }));
      await Promise.all([mutate(), globalMutate("/api/tally")]);
      showToast(
        result.actionSummary || (action === "approveReply" ? kitchenCopy(lang).savedReply : kitchenCopy(lang).pending),
        result.actionPerformed || action === "approveReply" ? "success" : "info"
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to process message";
      setActionError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const messages = data?.messages ?? [];

  return (
    <div className="min-h-full">
      <Header
        title={`📱 ${dict.messages.title}`}
        subtitle={`${data?.counts.new ?? 0} new • ${data?.counts.processed ?? 0} ${dict.messages.processed.toLowerCase()}`}
      />

      <div className="px-4 space-y-3 pb-6">
        {/* Status Counts */}
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="text-xs px-3 py-1.5">
            {data?.counts.new ?? 0} new
          </Badge>
          <Badge variant="success" className="text-xs px-3 py-1.5">
            {data?.counts.processed ?? 0} {dict.messages.processed}
          </Badge>
        </div>

        {/* Simulate Incoming WhatsApp Message */}
        <Card className="border-violet-200 bg-gradient-to-br from-white to-violet-50/40">
          <CardContent className="p-4">
            <form onSubmit={handleSimulateSend} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1C1917] flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-[#7C3AED]" />
                  {dict.messages.simulate}
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder={dict.messages.senderName}
                    aria-label={dict.messages.senderName}
                    className="min-h-[48px]"
                  />
                </div>
                <select
                  value={originalLang}
                  onChange={(e) => setOriginalLang(e.target.value)}
                  aria-label="Message language"
                  className="min-h-[48px] rounded-2xl border border-stone-200 bg-white px-2.5 text-sm font-semibold text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.code.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`${dict.messages.messageText} (e.g. Aaj tiffin skip karo)`}
                  aria-label={dict.messages.messageText}
                  className="min-h-[48px] flex-1"
                />
                <Button
                  type="submit"
                  disabled={sending}
                  aria-label={dict.messages.send}
                  className="min-h-[48px] px-4 shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{dict.messages.send}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error Banner */}
        {(error || actionError) && (
          <div
            role="alert"
            className="rounded-2xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError || "Could not load messages. Please try again."}</span>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 rounded-3xl bg-white animate-pulse border border-stone-100" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-2">
              <div className="text-4xl">📱</div>
              <p className="text-sm font-semibold text-[#78716C]">
                No messages yet. Simulate one above!
              </p>
            </CardContent>
          </Card>
        ) : (
          messages.map((msg) => {
            const isProcessed = msg.status === "processed";
            const isExpanded = !isProcessed || Boolean(expandedIds[msg.id]);
            const isProcessing = processingId === msg.id;
            const actionSummary = actionSummaries[msg.id];

            return (
              <Card
                key={msg.id}
                className={isProcessed ? "opacity-65 transition-opacity" : "border-orange-200"}
              >
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageCircle className="w-4 h-4 text-[#7C3AED] shrink-0" />
                      <span className="font-bold text-sm text-[#1C1917] truncate">
                        {msg.senderName}
                      </span>
                      <Badge variant="default" className="uppercase text-[10px] shrink-0">
                        {msg.originalLang}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {msg.intent && (
                        <Badge variant="saffron" className="text-[10px]">
                          {msg.intent}
                        </Badge>
                      )}
                      <Badge variant={isProcessed ? "success" : "warning"}>
                        {isProcessed ? dict.messages.processed : msg.status === "review" ? "Review" : "New"}
                      </Badge>
                    </div>
                  </div>

                  {/* WhatsApp-style green bubble for original message */}
                  <div className="text-sm text-[#1C1917] bg-emerald-50 rounded-2xl rounded-tl-sm p-3 border border-emerald-200">
                    &ldquo;{msg.originalText}&rdquo;
                  </div>

                  {isProcessed && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(msg.id)}
                      aria-label={isExpanded ? dict.messages.collapse : dict.messages.expand}
                      className="w-full min-h-[48px] flex items-center justify-between px-3 rounded-2xl bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-[#78716C] transition-colors"
                    >
                      <span>
                        {isExpanded ? dict.messages.collapse : dict.messages.expand} AI details
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  {isExpanded && (
                    <div className="space-y-2">
                      {msg.translatedText && msg.translatedLang === lang && (
                        <div className="flex items-start gap-2 rounded-2xl bg-orange-50/70 p-2.5 border border-orange-100 text-xs text-stone-700">
                          <Languages className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                          <span>{msg.translatedText}</span>
                        </div>
                      )}
                      {msg.status === "review" && msg.originalLang !== lang && msg.translatedLang !== lang && (
                        <p className="text-xs text-stone-600">{kitchenCopy(lang).unavailable}</p>
                      )}

                      {actionSummary && (
                        <div className="flex items-center gap-2 rounded-2xl bg-green-50 p-2.5 border border-green-200 text-xs font-semibold text-[#16A34A]">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>✅ {actionSummary}</span>
                        </div>
                      )}

                      {msg.autoReply && (
                        <div className="rounded-2xl bg-teal-50 border border-teal-200 p-3 text-xs font-semibold text-teal-900">
                          💬 {dict.messages.autoReply}: {msg.autoReply}
                          {msg.replyApprovedAt ? <p className="mt-2">Approved · simulated</p> : (
                            <Button type="button" className="mt-2" disabled={isProcessing}
                              onClick={() => handleProcessMessage(msg, "approveReply")}>Approve simulated reply</Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!isProcessed && (
                    <Button
                      type="button"
                      onClick={() => handleProcessMessage(msg, msg.proposal ? "approve" : "read")}
                      disabled={isProcessing}
                      aria-label={`${msg.proposal ? "Approve request" : "Review message"} from ${msg.senderName}`}
                      className="w-full min-h-[48px]"
                      variant="primary"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{dict.messages.processing}</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>{msg.proposal ? "Approve request" : "Review message"}</span>
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
