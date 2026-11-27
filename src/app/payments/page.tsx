"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR, { mutate as globalMutate } from "swr";
import { CheckCircle2, IndianRupee, Clock, Mic, Volume2, Square } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProvider";
import { useVoice } from "@/hooks/useVoice";

interface PaymentRowItem {
  id: string;
  month: string;
  amount: number;
  status: string;
  paidAmount: number;
  receipts?: Array<{ id: string; amount: number }>;
  reminderSent: boolean;
  customer: {
    id: string;
    name: string;
    dietaryPref: string;
    language: string;
  };
}

interface PaymentsResponse {
  month: string;
  summary: {
    collected: number;
    pending: number;
    pendingCount: number;
    paidCount: number;
  };
  payments: PaymentRowItem[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load payments");
  return res.json();
};

export default function PaymentsPage() {
  const { showToast, dict, lang } = useApp();
  const voice = useVoice({ lang });
  const { data, isLoading, mutate } = useSWR<PaymentsResponse>("/api/payments", fetcher);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [partialId, setPartialId] = useState<string | null>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [reminderId, setReminderId] = useState<string | null>(null);
  const receiptAttempt = useRef<{ paymentId: string; amount: number; receiptId: string } | null>(null);
  useEffect(() => {
    setReminderId(new URLSearchParams(window.location.search).get("reminder"));
  }, []);

  const handleReceipt = async (event: React.FormEvent, payment: PaymentRowItem) => {
    event.preventDefault();
    if (updatingId) return;
    const amount = Number(partialAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > payment.amount - payment.paidAmount) return;
    const previous = receiptAttempt.current;
    const receiptId = previous?.paymentId === payment.id && previous.amount === amount
      ? previous.receiptId : crypto.randomUUID();
    receiptAttempt.current = { paymentId: payment.id, amount, receiptId };
    setUpdatingId(payment.id);
    try {
      const response = await fetch(`/api/payments/${payment.id}/receipts`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, receiptId }),
      });
      if (!response.ok) throw new Error("Could not save the receipt");
      receiptAttempt.current = null;
      setPartialId(null);
      await Promise.all([mutate(), globalMutate("/api/tally")]);
      showToast("Receipt recorded", "success");
    } catch {
      showToast("Could not save the receipt. Check the balance and try again.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/payments/${id}/mark-paid`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await Promise.all([mutate(), globalMutate("/api/tally")]);
      showToast(json.alreadyPaid ? json.message : "Payment marked Paid ✅", "success");
    } catch {
      showToast("Failed to update payment", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingRows = data?.payments.filter((p) => p.status !== "paid") ?? [];
  const paidRows = data?.payments.filter((p) => p.status === "paid") ?? [];
  const selectedReminder = pendingRows.find((payment) => payment.id === reminderId && payment.reminderSent);

  const handleSpeakPending = () => {
    if (voice.status === "speaking") {
      voice.stopSpeaking();
      return;
    }
    if (pendingRows.length === 0) {
      const msg =
        lang === "en"
          ? "All payments are collected for this month."
          : lang === "kn"
            ? "ಈ ತಿಂಗಳು ಎಲ್ಲಾ ಪಾವತಿಗಳು ಪೂರ್ಣವಾಗಿವೆ."
            : "Is mahine sabhi customers ka payment aa gaya hai.";
      void voice.speak(msg, lang);
      return;
    }
    const listText = pendingRows
      .map((p) => `${p.customer.name.split(" ")[0]} ₹${Math.max(0, p.amount - p.paidAmount)}`)
      .join(", ");
    const msg =
      lang === "en"
        ? `${pendingRows.length} customers owe ₹${data?.summary.pending ?? 0}: ${listText}.`
        : lang === "kn"
          ? `${pendingRows.length} ಗ್ರಾಹಕರಿಂದ ಒಟ್ಟು ₹${data?.summary.pending ?? 0} ಬಾಕಿ ಇದೆ: ${listText}.`
          : `${pendingRows.length} customers ka total ₹${data?.summary.pending ?? 0} baaki hai: ${listText}.`;
    void voice.speak(msg, lang);
  };

  const askPaymentsPrompt =
    lang === "en"
      ? "Who hasn't paid?"
      : lang === "kn"
        ? "ಯಾರು ಪಾವತಿ ಮಾಡಿಲ್ಲ?"
        : "Kisne payment nahi kiya?";

  return (
    <div className="min-h-full">
      <Header
        title={`💰 Payments`}
        subtitle={data?.month ? `Month: ${data.month}` : "Monthly tracking"}
        rightSlot={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSpeakPending}
              disabled={!data}
              aria-label="Speak pending payments"
              className={`min-h-[38px] rounded-full border px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1 transition-all active:scale-95 ${
                voice.status === "speaking"
                  ? "bg-[#16A34A] text-white border-[#16A34A]"
                  : "bg-orange-50 text-[#EA580C] border-orange-200"
              }`}
            >
              {voice.status === "speaking" ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>{voice.status === "speaking" ? "Stop" : "Sunao"}</span>
            </button>
            <Link
              href={`/voice?prompt=${encodeURIComponent(askPaymentsPrompt)}`}
              className="min-h-[38px] rounded-full bg-[#7C3AED] text-white px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1 shadow-sm"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Ask</span>
            </Link>
          </div>
        }
      />

      <div className="px-4 space-y-4 pb-4">
        {selectedReminder && (
          <Card>
            <CardContent className="space-y-2 p-4">
              <h2 className="font-bold">Simulated UPI reminder</h2>
              <p className="text-sm">{selectedReminder.customer.name} · {formatINR(selectedReminder.amount - selectedReminder.paidAmount)} due</p>
              <p className="text-sm text-stone-600">Preview only. The amount is recorded when the cook enters a receipt.</p>
              <Button type="button" variant="outline" onClick={() => setReminderId(null)}>Close</Button>
            </CardContent>
          </Card>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-green-200 bg-green-50/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#16A34A]">
                <IndianRupee className="w-4 h-4" />
                {dict.collected}
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#1C1917]">
                {formatINR(data?.summary.collected ?? 0)}
              </p>
              <p className="text-xs text-[#78716C] mt-0.5">
                {data?.summary.paidCount ?? 0} paid
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#DC2626]">
                <Clock className="w-4 h-4" />
                {dict.pending}
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#1C1917]">
                {formatINR(data?.summary.pending ?? 0)}
              </p>
              <p className="text-xs text-[#78716C] mt-0.5">
                {data?.summary.pendingCount ?? 0} pending
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4 space-y-2.5">
            <h2 className="text-sm font-bold text-[#1C1917]">
              Pending ({pendingRows.length})
            </h2>
            {pendingRows.length > 0 && (
              <Link href={`/voice?prompt=${encodeURIComponent("Send payment reminders")}`}
                className="inline-flex min-h-[48px] items-center rounded-xl bg-violet-50 px-3 text-sm font-semibold text-violet-700">
                Prepare reminders (simulated)
              </Link>
            )}
            {isLoading ? (
              <div className="h-20 rounded-2xl bg-stone-100 animate-pulse" />
            ) : pendingRows.length === 0 ? (
              <p className="text-xs text-[#16A34A] font-semibold py-2">
                🎉 All payments collected for this month!
              </p>
            ) : (
              pendingRows.map((p) => (
                <div
                  key={p.id}
                  className="space-y-2 rounded-2xl border border-red-100 bg-red-50/30 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1C1917] truncate">
                      {p.customer.name}
                    </p>
                    <p className="text-xs font-semibold text-[#DC2626]">
                      {formatINR(Math.max(0, p.amount - p.paidAmount))} due
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="success"
                    disabled={updatingId === p.id}
                    onClick={() => void handleMarkPaid(p.id)}
                  >
                    {updatingId === p.id ? "..." : "Mark Paid"}
                  </Button>
                  </div>
                  {p.receipts?.length ? (
                    <p className="text-xs text-stone-600">Receipts · {p.receipts.map(({ amount }) => formatINR(amount)).join(", ")}</p>
                  ) : null}
                  {p.reminderSent && (
                    <Link href={`/payments?reminder=${encodeURIComponent(p.id)}`}
                      onClick={() => setReminderId(p.id)}
                      className="block text-sm font-semibold text-violet-700 underline">
                      Open UPI reminder preview
                    </Link>
                  )}
                  {partialId === p.id ? (
                    <form className="flex gap-2" onSubmit={(event) => void handleReceipt(event, p)}>
                      <input className="min-w-0 flex-1 rounded-xl border px-2" type="number" inputMode="numeric"
                        aria-label="Amount received in rupees" min={1} max={p.amount - p.paidAmount} required
                        value={partialAmount} onChange={(event) => setPartialAmount(event.target.value)} />
                      <Button type="submit" disabled={Boolean(updatingId)}>Save receipt</Button>
                    </form>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => { setPartialAmount(""); setPartialId(p.id); }}>Record amount</Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2.5">
            <h2 className="text-sm font-bold text-[#1C1917]">
              Paid ({paidRows.length})
            </h2>
            {paidRows.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50/70 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-bold text-[#1C1917]">{p.customer.name}</p>
                  <p className="text-xs text-[#78716C]">{formatINR(p.amount)}</p>
                  {p.receipts?.length ? (
                    <p className="text-xs text-stone-600">Receipts · {p.receipts.map(({ amount }) => formatINR(amount)).join(", ")}</p>
                  ) : null}
                </div>
                <Badge variant="success">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Paid
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
