"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Languages, MessageCircle, Plus, Search, Send, Volume2 } from "lucide-react";
import useSWR, { mutate as refresh } from "swr";
import { useApp } from "@/components/providers/AppProvider";
import { useVoice } from "@/hooks/useVoice";
import { translateText } from "@/lib/ai-provider";
import { inboxAction, readInboxMessage, type InboxMessage } from "@/lib/inbox-client";
import { SUPPORTED_LANGUAGES } from "@/lib/utils";

type Contact = { id: string; name: string; language: string };
type Delivery = {
  id: string;
  recipientName: string;
  customerId: string | null;
  text: string;
  language: string;
  sourceText: string;
  sourceLanguage: string;
  createdAt: string;
};
type Thread = {
  id: string;
  name: string;
  customerId: string | null;
  language: string;
  incoming: InboxMessage[];
  outgoing: Delivery[];
  latest?: { text: string; createdAt: string };
};

const threadKey = (name: string, customerId?: string | null) =>
  customerId ? `customer:${customerId}` : `contact:${name.trim().toLowerCase()}`;

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join("").toUpperCase();
}

async function load<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load chats.");
  return response.json();
}

export default function MessagesPage() {
  const { lang, aiTier, cook } = useApp();
  const voice = useVoice({ lang });
  const { data, error, mutate } = useSWR("/api/messages", load<{ messages: InboxMessage[]; deliveries?: Delivery[] }>, { refreshInterval: 1500 });
  const { data: contacts } = useSWR("/api/customers", load<{ customers: Contact[] }>);
  const [selected, setSelected] = useState<string>();
  const [mobileChats, setMobileChats] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"cook" | "customer">("cook");
  const [newContact, setNewContact] = useState<Thread>();
  const [contactName, setContactName] = useState("");
  const [creating, setCreating] = useState(false);
  const [compose, setCompose] = useState("");
  const [contactLanguage, setContactLanguage] = useState("hi");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const chat = useRef<HTMLDivElement>(null);

  const threads = useMemo(() => {
    const all = new Map<string, Thread>();
    function thread(name: string, customerId: string | null, language: string) {
      const id = threadKey(name, customerId);
      const existing = all.get(id);
      if (existing) return existing;
      const created = { id, name, customerId, language, incoming: [], outgoing: [] };
      all.set(id, created);
      return created as Thread;
    }
    for (const contact of contacts?.customers ?? []) thread(contact.name, contact.id, contact.language);
    for (const message of data?.messages ?? []) {
      const row = thread(message.senderName, message.customerId, message.originalLang);
      row.incoming.push(message);
      if (!row.latest || message.createdAt > row.latest.createdAt) row.latest = { text: message.originalText, createdAt: message.createdAt };
    }
    for (const delivery of data?.deliveries ?? []) {
      const row = thread(delivery.recipientName, delivery.customerId, delivery.language);
      row.outgoing.push(delivery);
      if (!row.latest || delivery.createdAt > row.latest.createdAt) row.latest = { text: delivery.text, createdAt: delivery.createdAt };
    }
    if (newContact && !all.has(newContact.id)) all.set(newContact.id, newContact);
    return Array.from(all.values()).sort((a, b) => (b.latest?.createdAt ?? "").localeCompare(a.latest?.createdAt ?? "") || a.name.localeCompare(b.name));
  }, [contacts, data, newContact]);
  const thread = threads.find(({ id }) => id === selected) ?? threads[0];
  const history = [
    ...(thread?.incoming.map((message) => ({ direction: "incoming" as const, message, time: message.createdAt })) ?? []),
    ...(thread?.outgoing.map((message) => ({ direction: "outgoing" as const, message, time: message.createdAt })) ?? []),
  ].sort((a, b) => a.time.localeCompare(b.time));
  const tail = history[history.length - 1]?.message.id;

  useEffect(() => {
    if (chat.current) chat.current.scrollTop = chat.current.scrollHeight;
  }, [thread?.id, tail, mobileChats, role]);
  useEffect(() => {
    if (thread?.language) setContactLanguage(thread.language);
  }, [thread?.id, thread?.language]);

  function open(item: Thread) {
    setSelected(item.id);
    setMobileChats(false);
    setContactLanguage(item.language);
    setCompose("");
    setFeedback("");
  }

  function createChat(event: FormEvent) {
    event.preventDefault();
    const name = contactName.trim();
    if (!name) return;
    const item = threads.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase()) ??
      { id: threadKey(name), name, customerId: null, language: contactLanguage, incoming: [], outgoing: [] };
    setNewContact(item);
    setRole("customer");
    setCreating(false);
    setContactName("");
    open(item);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!thread || !compose.trim() || busy) return;
    setBusy(true);
    setFeedback("");
    try {
      const customerId = thread.customerId ?? undefined;
      const text = compose.trim();
      let body: object = { text, recipientName: thread.name, customerId, language: thread.language };
      if (role === "customer") {
        body = { senderName: thread.name, customerId, originalText: text, originalLang: contactLanguage };
      } else if (lang !== thread.language && aiTier === "local") {
        const translated = await translateText(text, lang, thread.language, aiTier);
        if (!translated.notice) body = { ...body, localTranslation: translated.translated };
      }
      const response = await fetch(role === "customer" ? "/api/messages" : "/api/messages/outbox", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send this message.");
      setCompose("");
      if (role === "customer" && result.message) setSelected(threadKey(result.message.senderName, result.message.customerId));
      setFeedback(result.translationUnavailable ? "Sent in the original language. Translation was unavailable." : "");
      await mutate();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not send this message.");
    } finally {
      setBusy(false);
    }
  }

  async function review(message: InboxMessage, action: "read" | "approve" | "approveReply") {
    if (busy) return;
    setBusy(true);
    setFeedback("");
    try {
      const result = action === "read" ? await readInboxMessage(message, lang, aiTier)
        : await inboxAction(message.id, action, action === "approve" ? { proposal: message.proposal } : {});
      const { spokenSummary } = result;
      if (spokenSummary) setSummaries((previous) => ({ ...previous, [`${lang}:${message.id}`]: spokenSummary }));
      if (action === "approve" && !result.actionPerformed && !result.alreadyProcessed) {
        setFeedback("The request could not be applied. Check the customer and requested date.");
      }
      await mutate();
      if (action === "approve") void refresh("/api/tally");
    } catch {
      setFeedback("Could not update this chat. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const languageName = (code: string) => SUPPORTED_LANGUAGES.find((item) => item.code === code)?.nativeName ?? code;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f0f2f5] text-[#182621]">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-emerald-950/10 bg-[#075e54] px-3 py-2 text-white md:px-5">
        <div className="flex items-center gap-2"><MessageCircle size={21} /><h1 className="font-bold">WhatsApp simulator</h1></div>
        <div className="inline-flex rounded-full bg-black/20 p-1 text-xs" aria-label="Chat perspective">
          <button type="button" aria-pressed={role === "cook"} onClick={() => { setRole("cook"); setCompose(""); }} className={`min-h-9 rounded-full px-3 ${role === "cook" ? "bg-white font-bold text-[#075e54]" : ""}`}>Kitchen</button>
          <button type="button" aria-pressed={role === "customer"} onClick={() => { setRole("customer"); setCompose(""); }} className={`min-h-9 rounded-full px-3 ${role === "customer" ? "bg-white font-bold text-[#075e54]" : ""}`}>Customer</button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(220px,1fr)_minmax(0,2.2fr)]">
        <aside className={`${mobileChats ? "flex" : "hidden"} min-h-0 flex-col border-r border-stone-200 bg-white md:flex`} aria-label="Chat list">
          <div className="space-y-2 border-b border-stone-100 p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Chats</h2>
              <button type="button" aria-label="New contact" onClick={() => setCreating(!creating)} className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-800"><Plus size={20} /></button>
            </div>
            {creating && <form onSubmit={createChat} className="flex gap-2">
              <input autoFocus maxLength={100} value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Customer name" aria-label="New customer name" className="min-w-0 flex-1 rounded-lg border px-2 text-sm" />
              <button className="rounded-lg bg-[#075e54] px-3 py-2 text-sm font-semibold text-white">Open</button>
            </form>}
            <label className="flex items-center gap-2 rounded-lg bg-[#f0f2f5] px-3">
              <Search size={16} className="text-stone-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chats" aria-label="Search chats" className="min-h-10 w-full bg-transparent text-sm outline-none" />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {error ? <p className="p-4 text-sm text-red-700">Could not load chats.</p> : !data ? <p className="p-4 text-sm text-stone-600">Loading chats…</p> : null}
            {threads.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())).map((item) => {
              const unread = item.incoming.filter((entry) => entry.status === "new").length;
              return <button key={item.id} type="button" onClick={() => open(item)}
                aria-current={item.id === thread?.id ? "true" : undefined}
                className={`flex min-h-16 w-full items-center gap-3 border-b border-stone-100 px-3 py-2 text-left hover:bg-emerald-50 ${item.id === thread?.id ? "bg-[#e9f5ef]" : ""}`}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d9f3e6] text-sm font-bold text-[#075e54]">{initials(item.name)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.name}</span><span className="block truncate text-xs text-slate-600">{item.latest?.text ?? languageName(item.language)}</span></span>
                {unread > 0 && <span aria-label={`${unread} new messages`} className="rounded-full bg-[#087f5b] px-2 text-xs font-bold text-white">{unread}</span>}
              </button>;
            })}
          </div>
        </aside>
        <section className={`${mobileChats ? "hidden" : "flex"} min-h-0 flex-col bg-[#efeae2] md:flex`} aria-label="Conversation">
          {thread ? <>
            <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-stone-200 bg-[#f7f9fa] px-3">
              <button type="button" aria-label="Back to chats" className="grid size-10 place-items-center md:hidden" onClick={() => setMobileChats(true)}><ArrowLeft size={20} /></button>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d9f3e6] text-xs font-bold text-[#075e54]">{initials(thread.name)}</span>
              <div className="min-w-0"><h2 className="truncate text-sm font-bold">{role === "cook" ? thread.name : cook?.name ?? "Kitchen"}</h2>
                <p className="truncate text-xs text-slate-600">{role === "cook" ? `${languageName(lang)} kitchen · ${languageName(thread.language)} contact` : `Viewing as ${thread.name}`}</p></div>
            </div>
            <div ref={chat} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 md:px-6" role="log" aria-label="Messages">
              {history.length === 0 && <p className="mx-auto max-w-xs rounded-xl bg-white/80 p-3 text-center text-sm text-stone-600">No messages yet. Switch to Customer to send an enquiry to your kitchen.</p>}
              {history.map((entry) => {
                const mine = entry.direction === (role === "cook" ? "outgoing" : "incoming");
                const style = `max-w-[92%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm shadow-sm md:max-w-[80%] ${mine ? "ml-auto bg-[#d9fdd3]" : "mr-auto bg-white"}`;
                const at = new Date(entry.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                if (entry.direction === "outgoing") {
                  const item = entry.message;
                  return <article key={item.id} className={style}>
                    <p>{role === "cook" ? item.sourceText : item.text}</p>
                    {role === "cook" && item.text !== item.sourceText && <p className="mt-1 border-t border-emerald-900/15 pt-1 text-xs"><span className="font-bold">{languageName(item.language)} · </span>{item.text}</p>}
                    <footer className="mt-1 flex justify-end gap-1 text-[11px] text-slate-600">{at} <Check size={14} aria-label="Delivered in simulator" /></footer>
                  </article>;
                }
                const item = entry.message;
                const shownTranslation = item.translatedLang === lang ? item.translatedText : summaries[`${lang}:${item.id}`];
                return <article key={item.id} className={style}>
                  <p>{item.originalText}</p>
                  {role === "cook" && <>
                    {shownTranslation && <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs"><Languages size={14} className="mr-1 inline" />{shownTranslation}</div>}
                    {item.intent === "enquiry" && <p className="mt-1 text-xs font-semibold text-[#075e54]">New customer enquiry</p>}
                    {item.autoReply && !item.replyApprovedAt && <p className="mt-2 rounded-lg bg-stone-100 p-2 text-xs"><strong>Draft reply</strong><br />{item.autoReply}</p>}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[#075e54]">
                      {item.status !== "processed" && <button type="button" disabled={busy} onClick={() => void review(item, item.proposal ? "approve" : "read")} className="min-h-10 rounded-lg bg-emerald-50 px-2">{item.proposal ? "Approve request" : "Review message"}</button>}
                      {item.autoReply && !item.replyApprovedAt && <button type="button" disabled={busy} onClick={() => void review(item, "approveReply")} className="min-h-10 rounded-lg bg-emerald-50 px-2">Approve simulated reply</button>}
                      <button type="button" title="Stop Kitchen Mode before playing a message manually" aria-label="Read message aloud" onClick={() => void voice.speak(shownTranslation || item.originalText, shownTranslation ? lang : item.originalLang)} className="grid size-10 place-items-center rounded-full"><Volume2 size={17} /></button>
                    </div>
                  </>}
                  <footer className="mt-1 text-right text-[11px] text-slate-600">{languageName(item.originalLang)} · {at}</footer>
                </article>;
              })}
            </div>
            {feedback && <p role="status" className="bg-white px-3 py-1.5 text-xs text-stone-700">{feedback}</p>}
            <form onSubmit={send} className="flex shrink-0 flex-wrap items-center gap-2 border-t border-stone-200 bg-[#f0f2f5] p-2">
              {role === "customer" && <label className="w-full text-xs text-slate-600 md:w-auto">
                <span className="sr-only">Message language</span>
                <select value={contactLanguage} onChange={(event) => setContactLanguage(event.target.value)} className="h-10 rounded-lg border bg-white px-2">
                  {SUPPORTED_LANGUAGES.map(({ code, nativeName }) => <option key={code} value={code}>{nativeName}</option>)}
                </select>
              </label>}
              <input value={compose} onChange={(event) => setCompose(event.target.value)} placeholder={role === "cook" ? `Write to ${thread.name}` : "Write a message to the kitchen"} aria-label="Message text" maxLength={4000} className="min-h-11 min-w-0 flex-1 rounded-xl bg-white px-3 text-sm outline-emerald-700" />
              <button type="submit" aria-label="Send simulated message" disabled={busy || !compose.trim()} className="grid size-11 place-items-center rounded-full bg-[#075e54] text-white disabled:opacity-50"><Send size={19} /></button>
            </form>
          </> : <div className="grid flex-1 place-items-center text-sm text-slate-600">Choose a chat to start.</div>}
        </section>
      </div>
    </div>
  );
}
