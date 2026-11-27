"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import { ArrowLeft, Mic, Send, Square } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/components/providers/AppProvider";
import { useVoice } from "@/hooks/useVoice";
import { processVoiceCommand } from "@/lib/ai-provider";
import type { TallyBreakdown } from "@/lib/tally";
import { VoiceChat, type VoiceChatMessage } from "@/components/voice/VoiceChat";
import { Waveform, type WaveformMode } from "@/components/voice/Waveform";
import { VoiceStatus } from "@/components/voice/VoiceStatus";
import { isVoiceShortcut } from "@/lib/voice-shortcuts";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed");
  return res.json();
};

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getSamplePrompts(lang: string): string[] {
  if (lang === "en") {
    return [
      "How many tiffins today?",
      "Who hasn't paid?",
      "Add customer Kavita, Jain, 3200",
      "Skip Amit today",
      "Pause Priya for 3 days",
      "Cancel Rajesh today",
    ];
  }
  if (lang === "kn") {
    return [
      "ಇಂದು ಎಷ್ಟು ಟಿಫಿನ್?",
      "ಯಾರು ಪಾವತಿ ಮಾಡಿಲ್ಲ?",
      "Naya customer jodo, naam Kavita, Jain, 3200",
      "Amit aaj skip kardo",
    ];
  }
  return [
    "Aaj kitne tiffin banane hain?",
    "Kisne payment nahi kiya?",
    "Naya customer jodo, naam Kavita, Jain khana, 3200",
    "Amit aaj skip kardo",
    "Priya ko 3 din pause kardo",
    "Rajesh ka tiffin cancel karo",
  ];
}

function getWelcomeText(lang: string, cookName?: string): string {
  const first = cookName ? cookName.split(" ")[0] : "Sunita";
  if (lang === "en") {
    return `Namaste ${first}! Tap the mic and ask about today's tiffins, customers, or payments.`;
  }
  if (lang === "kn") {
    return `ನಮಸ್ಕಾರ ${first} ಅಕ್ಕ! ಮೈಕ್ ಒತ್ತಿ ಇಂದಿನ ಟಿಫಿನ್, ಗ್ರಾಹಕರು ಅಥವಾ ಪಾವತಿ ಬಗ್ಗೆ ಕೇಳಿ.`;
  }
  return `Namaste ${first} didi! Mic dabayein aur boliye — aaj kitne tiffin, payment, ya naya customer?`;
}

function VoiceContent() {
  const searchParams = useSearchParams();
  const { cook, lang, aiTier, showToast } = useApp();
  const { data: customersData } = useSWR<{
    customers: Array<{ id: string; name: string; phone: string | null }>;
  }>("/api/customers", fetcher);

  const [textInput, setTextInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [messages, setMessages] = useState<VoiceChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      text: getWelcomeText(lang, cook?.name),
      timestamp: "",
    },
  ]);

  const lastDisambiguatedTextRef = useRef<string>("");
  const autoRunPromptRef = useRef<string | null>(null);
  const autoListenAttemptedRef = useRef(false);
  const processingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const customersList = useMemo(
    () =>
      (customersData?.customers ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
      })),
    [customersData?.customers]
  );

  // Update welcome greeting & client timestamp after mount (avoids SSR TZ hydration mismatch)
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === "welcome") {
        return [
          {
            ...prev[0],
            text: getWelcomeText(lang, cook?.name),
            timestamp: prev[0].timestamp || nowTimeLabel(),
          },
        ];
      }
      return prev;
    });
  }, [lang, cook?.name]);

  const handleSubmitCommandRef = useRef<(rawText: string) => Promise<void>>(async () => {});

  const voice = useVoice({
    lang,
    onFinalTranscript: (transcript, conf) => {
      if (conf > 0 && conf < 0.6) {
        const repeatText =
          lang === "en"
            ? "Sorry, there was kitchen noise and I couldn't hear clearly. Please say that again?"
            : lang === "kn"
              ? "ಕ್ಷಮಿಸಿ, ಅಡುಗೆಮನೆಯಲ್ಲಿ ಶಬ್ದವಿತ್ತು, ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ?"
              : "Didi, kitchen mein shor tha, samajh nahi aaya — ek baar aur boliye?";
        setMessages((prev) => [
          ...prev,
          {
            id: `u-${Date.now()}`,
            role: "user",
            text: transcript,
            timestamp: nowTimeLabel(),
          },
          {
            id: `a-${Date.now() + 1}`,
            role: "assistant",
            text: repeatText,
            timestamp: nowTimeLabel(),
          },
        ]);
        if (autoSpeak) {
          void voice.speak(repeatText, lang);
        }
        return;
      }
      void handleSubmitCommandRef.current(transcript);
    },
  });

  const {
    isSTTSupported,
    status: voiceStatus,
    interimTranscript,
    error: voiceError,
    elapsedSeconds,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearError,
    cancelListening,
  } = voice;

  const handleSubmitCommand = useCallback(
    async (rawText: string) => {
      const raw = rawText.trim();
      const trimmed = lastDisambiguatedTextRef.current && /^\d{4}$/.test(raw)
        ? `${lastDisambiguatedTextRef.current} ${raw}`
        : raw;
      if (!trimmed || processingRef.current) return;
      processingRef.current = true;

      cancelListening();
      stopSpeaking();
      setTextInput("");
      clearError();
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          role: "user",
          text: trimmed,
          timestamp: nowTimeLabel(),
        },
      ]);

      setProcessing(true);
      try {
        const res = await processVoiceCommand(trimmed, lang, {
          tier: aiTier,
          customers: customersList,
        });
        if (res.actionPerformed) {
          await globalMutate((key) => typeof key === "string" && key.startsWith("/api/")).catch(() => undefined);
        }
        if (!mountedRef.current) return;

        if (res.needsDisambiguation) {
          lastDisambiguatedTextRef.current = trimmed;
        } else {
          lastDisambiguatedTextRef.current = "";
        }

        const pendingCustomers = Array.isArray(res.data?.pendingCustomers)
          ? (res.data?.pendingCustomers as Array<{ name: string; remaining: number }>)
          : undefined;

        const assistantMsg: VoiceChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: res.responseText,
          timestamp: nowTimeLabel(),
          intent: res.intent,
          tierUsed: res.tierUsed,
          actionPerformed: res.actionPerformed,
          actionSummary: res.actionSummary,
          needsDisambiguation: res.needsDisambiguation,
          candidates: res.candidates,
          tally: (res.tally as TallyBreakdown) ?? null,
          pendingCustomers,
          broadcastId: typeof res.data?.broadcastId === "string" ? res.data.broadcastId : undefined,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (autoSpeak && res.responseText) {
          void speak(res.responseText, lang);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        const msg = err instanceof Error ? err.message : "Could not process command";
        showToast(msg, "error");
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            text:
              lang === "en"
                ? "Sorry, something went wrong. Please try again."
                : "Maaf kijiye didi, kuch dikkat aayi. Phir se koshish karein.",
            timestamp: nowTimeLabel(),
          },
        ]);
      } finally {
        processingRef.current = false;
        if (mountedRef.current) setProcessing(false);
      }
    },
    [aiTier, autoSpeak, cancelListening, clearError, customersList, lang, showToast, speak, stopSpeaking]
  );

  handleSubmitCommandRef.current = handleSubmitCommand;

  // Auto-run ?prompt= if navigated from Dashboard / Payments quick voice action
  useEffect(() => {
    const promptParam = searchParams.get("prompt");
    if (promptParam && autoRunPromptRef.current !== promptParam) {
      autoRunPromptRef.current = promptParam;
      void handleSubmitCommand(promptParam);
    }
  }, [handleSubmitCommand, searchParams]);

  // Attempt auto-listen if navigated via floating MicButton (?listen=1)
  useEffect(() => {
    if (
      searchParams.get("listen") === "1" &&
      !autoListenAttemptedRef.current &&
      isSTTSupported
    ) {
      autoListenAttemptedRef.current = true;
      startListening();
    }
  }, [isSTTSupported, searchParams, startListening]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isVoiceShortcut(event, "Escape")) {
        event.preventDefault();
        cancelListening();
        stopSpeaking();
      } else if (isVoiceShortcut(event, "m") && !processingRef.current) {
        event.preventDefault();
        if (voiceStatus === "listening") stopListening();
        else startListening();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelListening, startListening, stopListening, stopSpeaking, voiceStatus]);

  const handleSelectCandidate = (candidateName: string, phoneLast4: string) => {
    const base = lastDisambiguatedTextRef.current;
    const replacement = phoneLast4 ? `${candidateName} ${phoneLast4}` : candidateName;
    if (!base) {
      void handleSubmitCommand(replacement);
      return;
    }
    const firstWord = candidateName.split(" ")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const updated = new RegExp(`\\b${firstWord}\\b`, "i").test(base)
      ? base.replace(new RegExp(`\\b${firstWord}\\b`, "i"), replacement)
      : `${base} ${replacement}`;
    void handleSubmitCommand(updated);
  };

  const handleMicToggle = () => {
    if (voiceStatus === "listening") {
      stopListening();
      return;
    }
    if (voiceStatus === "speaking") {
      stopSpeaking();
      return;
    }
    startListening();
  };

  const waveformMode: WaveformMode = processing
    ? "processing"
    : voiceStatus === "listening"
      ? "listening"
      : voiceStatus === "speaking"
        ? "speaking"
        : voiceStatus === "error"
          ? "error"
          : "idle";

  const samplePrompts = getSamplePrompts(lang);

  return (
    <div className="h-full min-h-0 flex flex-col">
      <Header
        title="Voice"
        rightSlot={
          <Link href="/" aria-label="Back to dashboard" className="w-12 h-12 rounded-full border border-orange-200 bg-white flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        }
      />

      <div className="px-4 gap-3 flex-1 min-h-0 pb-2 flex flex-col">
        {!voice.isSTTSupported && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-900">
            Voice mic works best in Chrome/Edge. Text command mode below is fully active!
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3" aria-label="Voice conversation" role="log" aria-live="polite">
          <VoiceChat
            messages={messages}
            onReplay={(txt) => void voice.speak(txt, lang)}
            onSelectCandidate={handleSelectCandidate}
          />
        </div>

        <Card className="shrink-0 border-violet-200 bg-gradient-to-br from-white to-violet-50/70">
          <CardContent className="p-3 space-y-2">
            <VoiceStatus
              mode={waveformMode}
              elapsedSeconds={voice.elapsedSeconds}
              lang={lang}
              aiTier={aiTier}
              autoSpeak={autoSpeak}
              onToggleAutoSpeak={() => {
                if (autoSpeak) voice.stopSpeaking();
                setAutoSpeak((v) => !v);
              }}
              interimTranscript={voice.interimTranscript}
              error={voice.error}
            />

            <Waveform
              mode={waveformMode}
              activeActivity={Boolean(voice.interimTranscript)}
            />

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleMicToggle}
                disabled={processing}
                aria-keyshortcuts="M"
                aria-label={
                  voice.status === "listening"
                    ? "Stop listening"
                    : voice.status === "speaking"
                      ? "Stop speaking"
                      : "Start listening"
                }
                className={`w-16 h-16 rounded-full text-white flex items-center justify-center shadow-mic border-4 border-white transition-transform active:scale-95 disabled:opacity-60 ${
                  voice.status === "listening"
                    ? "bg-[#DC2626] animate-pulse"
                    : voice.status === "speaking"
                      ? "bg-[#16A34A]"
                      : "bg-gradient-to-br from-[#7C3AED] to-[#F97316] hover:scale-105"
                }`}
              >
                {voice.status === "listening" || voice.status === "speaking" ? (
                  <Square className="w-6 h-6 fill-current" />
                ) : (
                  <Mic className="w-7 h-7 stroke-[2.4]" />
                )}
              </button>
            </div>

            <p className="text-center text-xs text-stone-500">M: microphone · Esc: stop</p>
            <div className="grid grid-cols-2 gap-1.5">
              {samplePrompts.slice(0, 2).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={processing}
                  onClick={() => void handleSubmitCommand(prompt)}
                  className="min-h-[48px] rounded-2xl bg-white border border-violet-200 px-2 py-1.5 text-xs font-semibold text-[#7C3AED] hover:bg-violet-50 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmitCommand(textInput);
              }}
              className="flex gap-2"
            >
              <Input
                placeholder={
                  lang === "en"
                    ? "Type or speak a command..."
                    : "Bolein ya yahan type karein..."
                }
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={processing}
              />
              <Button
                type="submit"
                variant="accent"
                size="md"
                disabled={processing || !textInput.trim()}
                aria-label="Send command"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VoicePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-stone-500">Loading Voice...</div>}>
      <VoiceContent />
    </Suspense>
  );
}
