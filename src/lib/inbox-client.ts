import { translateText, type AITier } from "./ai-provider";

export interface InboxMessage {
  id: string;
  customerId: string | null;
  senderName: string;
  originalText: string;
  originalLang: string;
  status: string;
  intent: string | null;
  translatedText: string | null;
  translatedLang: string | null;
  autoReply: string | null;
  proposal: string | null;
  replyApprovedAt: string | null;
  createdAt: string;
}

export async function inboxAction(id: string, action: "read" | "approve" | "approveAndReply" | "saveReply" | "approveReply", fields: object = {}) {
  const response = await fetch(`/api/messages/${encodeURIComponent(id)}/process`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, action }),
  });
  if (!response.ok) throw new Error("Inbox request failed");
  return response.json() as Promise<{
    message: InboxMessage;
    actionPerformed: boolean;
    alreadyProcessed: boolean;
    actionSummary?: string;
    spokenSummary?: string;
    replyMeaning?: string;
  }>;
}

export async function readInboxMessage(message: InboxMessage, lang: string, tier: AITier) {
  if (tier !== "local") return inboxAction(message.id, "read");
  const { localIntentParse } = await import("./runanywhere");
  const localParsed = await localIntentParse(message.originalText, lang, { cookLang: lang });
  const translation = message.originalLang === lang ? undefined
    : await translateText(message.originalText, message.originalLang, lang, tier);
  return inboxAction(message.id, "read", {
    localParsed,
    localTranslation: translation?.notice ? undefined : translation?.translated,
  });
}
