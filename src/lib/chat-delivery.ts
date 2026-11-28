import type { Prisma } from "@prisma/client";

export interface Delivery {
  id?: string;
  recipientName: string;
  customerId?: string | null;
  kind: "reply" | "menu" | "reminder" | "manual";
  sourceText: string;
  sourceLanguage: string;
  text: string;
  language: string;
}

export async function deliverInSimulator(db: Prisma.TransactionClient, delivery: Delivery) {
  if (!delivery.id) return db.chatDelivery.create({ data: delivery });
  return db.chatDelivery.upsert({ where: { id: delivery.id }, create: delivery, update: {} });
}

export function paymentReminder(lang: string, amount: number) {
  return ({
    en: `Hello! A friendly reminder that ₹${amount} is due for your tiffin service. Thank you.`,
    hi: `नमस्ते! आपके टिफ़िन के ₹${amount} बाकी हैं। कृपया भुगतान कर दें। धन्यवाद।`,
    kn: `ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಟಿಫಿನ್ ಸೇವೆಗೆ ₹${amount} ಬಾಕಿ ಇದೆ. ದಯವಿಟ್ಟು ಪಾವತಿಸಿ. ಧನ್ಯವಾದಗಳು.`,
    ta: `வணக்கம்! உங்கள் டிபன் சேவைக்கு ₹${amount} பாக்கி உள்ளது. தயவுசெய்து செலுத்துங்கள். நன்றி.`,
    te: `నమస్కారం! మీ టిఫిన్ సేవకు ₹${amount} బాకీ ఉంది. దయచేసి చెల్లించండి. ధన్యవాదాలు.`,
    mr: `नमस्कार! तुमच्या डबा सेवेसाठी ₹${amount} बाकी आहेत. कृपया भरा. धन्यवाद.`,
  })[lang] ?? `Hello! Your tiffin balance is ₹${amount}. Thank you.`;
}

export function supportedChatLanguage(lang: string) {
  return ["en", "hi", "kn", "ta", "te", "mr"].includes(lang) ? lang : "en";
}

export async function sendStoredReply(db: Prisma.TransactionClient, id: string) {
  const message = await db.message.findUnique({ where: { id } });
  if (!message?.autoReply) return null;
  const language = supportedChatLanguage(message.originalLang);
  await deliverInSimulator(db, {
    id: `reply:${id}`, recipientName: message.senderName, customerId: message.customerId,
    kind: "reply", sourceText: message.autoReply, sourceLanguage: language,
    text: message.autoReply, language,
  });
  return db.message.update({
    where: { id },
    data: {
      replyApprovedAt: message.replyApprovedAt ?? new Date(),
      ...(message.intent === "enquiry" ? { status: "processed" } : {}),
    },
  });
}
