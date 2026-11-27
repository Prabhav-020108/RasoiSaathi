"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import useSWR, { mutate } from "swr";
import { useApp } from "@/components/providers/AppProvider";
import { getSpeechLocale, useVoice } from "@/hooks/useVoice";
import { localMenuTranslations, processVoiceCommand, translateText } from "@/lib/ai-provider";
import { inboxAction, readInboxMessage, type InboxMessage } from "@/lib/inbox-client";
import { kitchenControl, kitchenCopy, wakeCommand } from "@/lib/kitchen-language";

type FollowUp =
  | { kind: "message" | "reply" | "dictate"; message: InboxMessage }
  | { kind: "translatedMessage"; message: InboxMessage }
  | { kind: "customer"; command: string; candidates?: Array<{ name: string; phoneLast4: string }> }
  | { kind: "confirm"; token: string }
  | { kind: "menu" | "reviseMenu"; id: string; languages: string[]; audience: number };

async function loadInbox(url: string) {
  const result = await fetch(url);
  if (!result.ok) throw new Error("Could not load the inbox");
  return result.json() as Promise<{ messages: InboxMessage[] }>;
}

export function KitchenMode() {
  const { lang, aiTier, cookLoading } = useApp();
  const words = kitchenCopy(lang);
  const [active, setActive] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState("");
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const session = useRef(0);
  const running = useRef(false);
  const inTurn = useRef(false);
  const commandUntil = useRef(0);
  const lastQuery = useRef("");
  const lastCustomer = useRef("");
  const seen = useRef(new Set<string>());
  const known = useRef<Set<string> | null>(null);
  const queue = useRef<InboxMessage[]>([]);
  const deferred = useRef<InboxMessage | null>(null);
  const recognitionFailures = useRef(0);
  const { data: inbox } = useSWR("/api/messages", loadInbox, { refreshInterval: active ? 4000 : 0 });

  const voice = useVoice({
    lang,
    kitchen: true,
    onRecognitionFailure(code) {
      if (code === "no-speech" || code === "aborted") return;
      recognitionFailures.current++;
      if (["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"].includes(code) ||
          recognitionFailures.current >= 3) stop(true);
    },
    onFinalTranscript(text, confidence) {
      recognitionFailures.current = 0;
      if (running.current && !inTurn.current) {
        void runTurn(() => handleTranscript(text, confidence));
      }
    },
  });
  const { startListening, cancelListening, stopSpeaking, speak, status } = voice;

  function stop(needsResume = false) {
    running.current = false;
    session.current++;
    inTurn.current = false;
    commandUntil.current = 0;
    document.documentElement.removeAttribute("data-kitchen-mode");
    setActive(false);
    setSuspended(needsResume);
    setBusy(false);
    setFollowUp(null);
    cancelListening();
    stopSpeaking();
  }

  async function say(text: string, turn: number) {
    if (!text || session.current !== turn) return;
    setLast(text);
    await speak(text, lang);
  }

  async function runTurn(work: () => Promise<void>) {
    const turn = session.current;
    inTurn.current = true;
    setBusy(true);
    cancelListening();
    try {
      await work();
    } catch {
      await say(words.failed, turn);
    } finally {
      if (session.current === turn) {
        inTurn.current = false;
        setBusy(false);
      }
    }
  }

  async function readMessage(message: InboxMessage, turn: number) {
    seen.current.add(message.id);
    const { message: reviewed, spokenSummary } = await readInboxMessage(message, lang, aiTier);
    if (turn !== session.current) return;
    void mutate("/api/messages");
    const text = reviewed.originalLang === lang ? reviewed.originalText
      : reviewed.translatedLang === lang && reviewed.translatedText ? reviewed.translatedText
        : spokenSummary ? `${words.unavailable} ${spokenSummary}` : words.unavailable;
    setFollowUp({ kind: text === words.unavailable ? "message" : "translatedMessage", message: reviewed });
    await say(`${words.newMessage} ${reviewed.senderName}. ${text} ${reviewed.proposal && text !== words.unavailable ? words.approve : words.pending}`, turn);
  }

  async function readNext(turn: number) {
    const current = await loadInbox("/api/messages");
    const message = [...current.messages].reverse().find((item) => item.status !== "processed" && !seen.current.has(item.id));
    if (turn !== session.current) return;
    if (message) await readMessage(message, turn);
    else {
      seen.current.clear();
      await say(words.empty, turn);
    }
  }

  async function reviewReply(message: InboxMessage, turn: number, meaning?: string) {
    if (!message.autoReply || turn !== session.current) return;
    const translated = meaning ? { translated: meaning, notice: undefined } : message.originalLang === lang
      ? { translated: message.autoReply, notice: undefined }
      : await translateText(message.autoReply, message.originalLang, lang, aiTier);
    if (turn !== session.current) return;
    if (translated.notice || (message.originalLang !== lang && translated.translated.trim() === message.autoReply.trim())) {
      await say(words.unavailable, turn);
      return;
    }
    setFollowUp({ kind: "reply", message });
    await say(`${translated.translated} ${words.approve}`, turn);
  }

  async function runCommand(command: string, turn: number, confirmationToken?: string) {
    const result = await processVoiceCommand(command, lang, {
      tier: aiTier, kitchen: true, confirmationToken, lastCustomer: lastCustomer.current,
    });
    if (result.actionPerformed) void mutate((key) => typeof key === "string" && key.startsWith("/api/"));
    if (turn !== session.current) return;
    if (result.intent === "menu_broadcast" && result.actionPerformed) {
      const { broadcastId, menuText, languages, audience } = result.data ?? {};
      if (typeof broadcastId === "string" && typeof menuText === "string" &&
          Array.isArray(languages) && typeof audience === "number") {
        const menu = { id: broadcastId, languages: languages.filter((item): item is string => typeof item === "string"), audience };
        if (aiTier === "local") await reviseMenu(menu, menuText, turn);
        else {
          setFollowUp({ kind: "menu", ...menu });
          await say(`${menuText}. ${audience}. ${words.approve}`, turn);
        }
        return;
      }
    }
    if (result.intent === "tally") lastQuery.current = command;
    if (typeof result.entities.customerName === "string" && (result.actionPerformed || result.intent === "payment_check")) {
      lastCustomer.current = result.entities.customerName;
    }
    if (result.confirmationToken) setFollowUp({ kind: "confirm", token: result.confirmationToken });
    else if (result.needsDisambiguation || result.needsCustomerName) {
      setFollowUp({ kind: "customer", command, candidates: result.candidates });
    }
    await say(result.responseText, turn);
  }

  async function reviseMenu(menu: Omit<Extract<FollowUp, { kind: "menu" | "reviseMenu" }>, "kind">, text: string, turn: number) {
    const localTranslations = aiTier === "local" ? await localMenuTranslations(text, lang, menu.languages) : undefined;
    if (turn !== session.current) return;
    const result = await fetch(`/api/menu/broadcast/${menu.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revise", menuText: text, localTranslations }),
    });
    if (!result.ok) throw new Error("Menu revision failed");
    if (turn !== session.current) return;
    setFollowUp({ ...menu, kind: "menu" });
    void mutate("/api/menu/broadcast");
    await say(`${text}. ${menu.audience}. ${words.approve}`, turn);
  }

  async function handleTranscript(text: string, confidence: number) {
    const turn = session.current;
    const afterWake = wakeCommand(text);
    const command = afterWake ?? text;
    const control = kitchenControl(command);
    if (afterWake === null && Date.now() > commandUntil.current && !followUp && control !== "stop") return;
    if (confidence > 0 && confidence < 0.6) {
      await say(words.retry, turn);
      return;
    }
    commandUntil.current = 0;
    if (control === "stop") {
      await say(words.stopped, turn);
      if (session.current === turn) stop();
      return;
    }
    if (!command) {
      await say(words.listening, turn);
      if (turn === session.current) commandUntil.current = Date.now() + 10_000;
      return;
    }
    if (control === "repeat") {
      await say(last || words.listening, turn);
      return;
    }
    if (control === "no") {
      if (followUp?.kind === "message" || followUp?.kind === "translatedMessage") deferred.current = followUp.message;
      setFollowUp(null);
      await say(words.cancelled, turn);
      return;
    }
    if (control === "messages" || control === "next") {
      setFollowUp(null);
      if (control === "messages" && deferred.current) {
        const message = deferred.current;
        deferred.current = null;
        await readMessage(message, turn);
      } else await readNext(turn);
      return;
    }
    if (control === "menu" && !followUp) {
      const response = await fetch("/api/menu/broadcast");
      if (!response.ok) throw new Error("Could not read the menu");
      const { broadcasts } = await response.json() as { broadcasts: Array<{ menuText: string; translations: Record<string, string> }> };
      const menu = broadcasts[0];
      await say(menu ? (menu.translations[lang] || menu.menuText).replace(/ \(Original - translate with Gemini API\)$/, "") : words.empty, turn);
      return;
    }
    if (followUp?.kind === "confirm" && control === "yes") {
      setFollowUp(null);
      await runCommand("confirm", turn, followUp.token);
      return;
    }
    if (followUp?.kind === "menu" && control === "edit") {
      setFollowUp({ ...followUp, kind: "reviseMenu" });
      await say(words.listening, turn);
      return;
    }
    if (followUp?.kind === "reviseMenu") {
      await reviseMenu(followUp, command, turn);
      return;
    }
    if (followUp?.kind === "menu" && control === "yes") {
      const menu = followUp;
      setFollowUp(null);
      const result = await fetch(`/api/menu/broadcast/${menu.id}`, { method: "PATCH" });
      if (!result.ok) throw new Error("Menu approval failed");
      void mutate("/api/menu/broadcast");
      await say(words.savedReply, turn);
      return;
    }
    if (followUp?.kind === "customer") {
      const choice = followUp.candidates?.find((entry) => entry.name.toLowerCase() === command.toLowerCase() || entry.phoneLast4 === command);
      if (followUp.candidates && !choice) return say(words.retry, turn);
      setFollowUp(null);
      await runCommand(`${followUp.command} ${choice?.phoneLast4 || choice?.name || command}`, turn);
      return;
    }
    if ((followUp?.kind === "message" || followUp?.kind === "translatedMessage") && control === "reply") {
      setFollowUp({ kind: "dictate", message: followUp.message });
      await say(words.dictate, turn);
      return;
    }
    if (followUp?.kind === "dictate") {
      const message = followUp.message;
      const translation = message.originalLang === lang ? { translated: command, notice: undefined }
        : await translateText(command, lang, message.originalLang, aiTier);
      if (turn !== session.current) return;
      if (translation.notice || (message.originalLang !== lang && translation.translated.trim() === command.trim())) {
        await say(words.unavailable, turn);
        return;
      }
      await inboxAction(message.id, "saveReply", { reply: translation.translated });
      await reviewReply({ ...message, autoReply: translation.translated }, turn);
      return;
    }
    if ((followUp?.kind === "message" || followUp?.kind === "translatedMessage") && control === "yes") {
      const message = followUp.message;
      if (!message.proposal || followUp.kind !== "translatedMessage") {
        return say(words.pending, turn);
      }
      setFollowUp(null);
      const result = await inboxAction(message.id, "approve", { proposal: message.proposal });
      void mutate("/api/messages");
      void mutate("/api/tally");
      if (!result.actionPerformed && !result.alreadyProcessed) return say(words.pending, turn);
      await reviewReply(result.message, turn, result.replyMeaning);
      return;
    }
    if (followUp?.kind === "reply" && control === "yes") {
      await inboxAction(followUp.message.id, "approveReply");
      setFollowUp(null);
      void mutate("/api/messages");
      await say(words.savedReply, turn);
      return;
    }
    if (followUp) return say(words.retry, turn);
    const tomorrow = control === "tomorrow" && lastQuery.current;
    await runCommand(tomorrow
      ? `${lastQuery.current.replace(/\btoday\b|\baaj\b|आज|ಇಂದು|இன்று|ఈరోజు/gi, "")} tomorrow`
      : command, turn);
  }

  function start() {
    if (!voice.isSTTSupported || document.hidden) return;
    session.current++;
    running.current = true;
    recognitionFailures.current = 0;
    known.current = inbox ? new Set(inbox.messages.map(({ id }) => id)) : null;
    queue.current = [];
    deferred.current = null;
    seen.current.clear();
    lastCustomer.current = "";
    lastQuery.current = "";
    document.documentElement.setAttribute("data-kitchen-mode", "");
    window.dispatchEvent(new Event("kitchen-mode-start"));
    setSuspended(false);
    setActive(true);
    setLast(words.ready);
    startListening();
  }

  useEffect(() => {
    if (!active || !inbox) return;
    const ids = new Set(inbox.messages.map(({ id }) => id));
    if (known.current) {
      queue.current.push(...inbox.messages.filter((message) =>
        !known.current!.has(message.id) && message.status === "new").reverse());
    }
    known.current = ids;
  }, [active, inbox]);

  useEffect(() => {
    if (!active || busy || status === "speaking") return;
    const timer = window.setTimeout(() => {
      if (!running.current || inTurn.current || document.hidden) return;
      const next = !followUp && Date.now() > commandUntil.current && (status !== "listening" || !voice.interimTranscript)
        ? queue.current.shift() : undefined;
      if (next) void runTurn(() => readMessage(next, session.current));
      else if (status !== "listening") {
        startListening();
      }
    }, status === "listening" ? 900 : 350);
    return () => window.clearTimeout(timer);
  // Transcript handling uses the current render when an idle or inbox event arrives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, busy, status, followUp, inbox, voice.interimTranscript, startListening]);

  useEffect(() => {
    if (!followUp || busy) return;
    const timer = window.setTimeout(() => setFollowUp(null), 30_000);
    return () => window.clearTimeout(timer);
  }, [busy, followUp]);

  useEffect(() => {
    if (!active) return;
    let lock: WakeLockSentinel | undefined;
    let disposed = false;
    void navigator.wakeLock?.request("screen").then((result) => {
      if (disposed) void result.release();
      else lock = result;
    }).catch(() => {});
    const onVisibility = () => {
      if (!document.hidden) return;
      running.current = false;
      session.current++;
      inTurn.current = false;
      commandUntil.current = 0;
      document.documentElement.removeAttribute("data-kitchen-mode");
      cancelListening();
      stopSpeaking();
      setFollowUp(null);
      setBusy(false);
      setActive(false);
      setSuspended(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      void lock?.release();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, cancelListening, stopSpeaking]);

  const hasVoice = !active || !window.speechSynthesis?.getVoices().length ||
    window.speechSynthesis.getVoices().some((item) => item.lang.toLowerCase().startsWith(getSpeechLocale(lang).slice(0, 2)));

  return (
    <section className="shrink-0 border-b border-violet-100 bg-violet-50 px-3 py-2 text-violet-950">
      <div className="flex items-center gap-3">
        <button type="button" disabled={!voice.isSTTSupported || cookLoading}
          onClick={() => active ? stop() : start()}
          className="inline-flex min-h-12 shrink-0 max-w-[65%] items-center gap-2 rounded-xl bg-violet-700 px-3 text-left text-sm font-bold text-white disabled:opacity-50">
          {active ? <Square size={15} /> : <Mic size={16} />}
          {active ? words.stop : suspended ? words.resume : words.start}
        </button>
        <span className="text-xs" role="status">
          {active ? busy || followUp || Date.now() < commandUntil.current ? words.listening : words.waiting : words.disclosure}
        </span>
      </div>
      {active && last && <p className="mt-1 line-clamp-2 text-sm" aria-live="polite">{last}</p>}
      {suspended && voice.error && <p className="mt-1 text-sm">{voice.error}</p>}
      {!hasVoice && <p className="mt-1 text-sm">{words.voiceUnavailable}</p>}
    </section>
  );
}
