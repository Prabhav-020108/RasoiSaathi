import type { PrismaClient } from "@prisma/client";
import { getTodayUTC, getCurrentMonthKey } from "./kitchen-date";

export const DEMO_COOK = {
  name: "Sunita Devi",
  phone: "+91 98765 43210",
  language: "hi",
  defaultPrice: 3000,
};

export const DEMO_CUSTOMERS = [
  {
    name: "Rajesh Kumar",
    phone: "+91 98111 10001",
    language: "hi",
    dietaryPref: "regular",
    monthlyPrice: 3000,
    status: "active",
    paid: true,
    todayStatus: "active",
    extraItems: null,
    specialNotes: "Prefers lunch by 12:30 PM",
  },
  {
    name: "Priya Sharma",
    phone: "+91 98111 10002",
    language: "hi",
    dietaryPref: "jain",
    monthlyPrice: 3500,
    status: "active",
    paid: false,
    todayStatus: "active",
    extraItems: null,
    specialNotes: "Strict Jain — no root vegetables",
  },
  {
    name: "Amit Verma",
    phone: "+91 98111 10003",
    language: "hi",
    dietaryPref: "regular",
    monthlyPrice: 2500,
    status: "active",
    paid: false,
    todayStatus: "skipped",
    extraItems: null,
    specialNotes: "Office party skip today",
  },
  {
    name: "Sarah Thomas",
    phone: "+91 98111 10004",
    language: "en",
    dietaryPref: "regular",
    monthlyPrice: 3000,
    status: "active",
    paid: true,
    todayStatus: "active",
    extraItems: null,
    specialNotes: "English speaker — send menu in English",
  },
  {
    name: "Deepa Nair",
    phone: "+91 98111 10005",
    language: "en",
    dietaryPref: "less-oil",
    monthlyPrice: 3000,
    status: "active",
    paid: false,
    todayStatus: "active",
    extraItems: null,
    specialNotes: "Low oil phulkas preferred",
  },
  {
    name: "Meena Ji",
    phone: "+91 98111 10006",
    language: "hi",
    dietaryPref: "less-oil",
    monthlyPrice: 2800,
    status: "paused",
    paid: true,
    todayStatus: "active",
    extraItems: null,
    specialNotes: "Paused for 3 days — out of town",
  },
  {
    name: "Rahul Hegde",
    phone: "+91 98111 10007",
    language: "kn",
    dietaryPref: "regular",
    monthlyPrice: 3000,
    status: "active",
    paid: true,
    todayStatus: "active",
    extraItems: null,
    specialNotes: "Kannada speaker",
  },
  {
    name: "Pooja Reddy",
    phone: "+91 98111 10008",
    language: "te",
    dietaryPref: "regular",
    monthlyPrice: 3000,
    status: "active",
    paid: true,
    todayStatus: "extra",
    extraItems: "2 extra roti",
    specialNotes: "Telugu speaker — requested 2 extra rotis today",
  },
  {
    name: "Sanjay Gupta",
    phone: "+91 98111 10009",
    language: "hi",
    dietaryPref: "no-onion-garlic",
    monthlyPrice: 3500,
    status: "active",
    paid: false,
    todayStatus: "active",
    extraItems: null,
    specialNotes: "No onion, no garlic",
  },
  {
    name: "Vikram Singh",
    phone: "+91 98111 10010",
    language: "hi",
    dietaryPref: "regular",
    monthlyPrice: 3000,
    status: "active",
    paid: true,
    todayStatus: "active",
    extraItems: null,
    specialNotes: "Regular afternoon tiffin",
  },
] as const;

export const DEMO_MESSAGES = [
  {
    senderName: "Amit Verma",
    originalText: "Aunty aaj skip kardo, office mein party hai",
    originalLang: "hi",
    translatedText: "आंटी आज टिफिन स्किप कर दो, ऑफिस में पार्टी है",
    translatedLang: "hi",
    intent: "skip",
    status: "processed",
    autoReply: "✅ Aaj ka tiffin skip ho gaya hai, Amit ji.",
    minutesAgo: 95,
  },
  {
    senderName: "Sarah Thomas",
    originalText: "Please skip tomorrow, I have an office party",
    originalLang: "en",
    translatedText: "कृपया कल टिफिन स्किप कर दें, मेरी ऑफिस पार्टी है",
    translatedLang: "hi",
    intent: "skip",
    status: "new",
    autoReply: null,
    minutesAgo: 45,
  },
  {
    senderName: "Pooja Reddy",
    originalText: "Rendi extra roti pack cheyyandi",
    originalLang: "te",
    translatedText: "दो एक्स्ट्रा रोटी पैक कर दीजिए",
    translatedLang: "hi",
    intent: "extra",
    status: "new",
    autoReply: null,
    minutesAgo: 25,
  },
  {
    senderName: "Meena Ji",
    originalText: "3 din ke liye tiffin band kardo",
    originalLang: "hi",
    translatedText: "3 दिन के लिए टिफिन बंद कर दो",
    translatedLang: "hi",
    intent: "pause",
    status: "processed",
    autoReply: "⏸️ Theek hai Meena ji, 3 din ke liye pause kar diya hai.",
    minutesAgo: 15,
  },
  {
    senderName: "Rajesh Kumar",
    originalText: "Kal se Jain khana banana please",
    originalLang: "hi",
    translatedText: "कल से जैन खाना बनाना प्लीज़",
    translatedLang: "hi",
    intent: "diet-change",
    status: "new",
    autoReply: null,
    minutesAgo: 5,
  },
] as const;

export async function seedDatabase(
  prisma: PrismaClient,
  options: { force?: boolean } = {}
) {
  const existingCook = await prisma.cook.findFirst();
  if (existingCook && !options.force) {
    return { seeded: false, reason: "already_seeded" };
  }

  if (options.force) {
    await prisma.message.deleteMany();
    await prisma.dailyOrder.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.menuBroadcast.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.cook.deleteMany();
  }

  const cook = await prisma.cook.create({
    data: DEMO_COOK,
  });

  const now = new Date();
  const todayUTC = getTodayUTC(now);
  const currentMonth = getCurrentMonthKey(now);
  const pauseUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const customerIdByName = new Map<string, string>();

  for (const c of DEMO_CUSTOMERS) {
    const customer = await prisma.customer.create({
      data: {
        cookId: cook.id,
        name: c.name,
        phone: c.phone,
        language: c.language,
        dietaryPref: c.dietaryPref,
        monthlyPrice: c.monthlyPrice,
        status: c.status,
        pauseUntil: c.status === "paused" ? pauseUntil : null,
        specialNotes: c.specialNotes,
      },
    });

    customerIdByName.set(c.name, customer.id);

    await prisma.payment.create({
      data: {
        customerId: customer.id,
        month: currentMonth,
        amount: c.monthlyPrice,
        status: c.paid ? "paid" : "pending",
        paidAmount: c.paid ? c.monthlyPrice : 0,
        paidAt: c.paid ? now : null,
      },
    });

    if (c.todayStatus !== "active") {
      await prisma.dailyOrder.create({
        data: {
          customerId: customer.id,
          date: todayUTC,
          status: c.todayStatus,
          extraItems: c.extraItems,
        },
      });
    }
  }

  for (const m of DEMO_MESSAGES) {
    await prisma.message.create({
      data: {
        customerId: customerIdByName.get(m.senderName) ?? null,
        senderName: m.senderName,
        originalText: m.originalText,
        originalLang: m.originalLang,
        translatedText: m.translatedText,
        translatedLang: m.translatedLang,
        intent: m.intent,
        status: m.status,
        autoReply: m.autoReply,
        createdAt: new Date(now.getTime() - m.minutesAgo * 60 * 1000),
      },
    });
  }

  return { seeded: true, customersCount: DEMO_CUSTOMERS.length };
}
