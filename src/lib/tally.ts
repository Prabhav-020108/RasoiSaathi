import { prisma } from "./prisma";
import { getCurrentMonthKey, getTodayUTC } from "./utils";

export interface TallyCustomerInput {
  id: string;
  name: string;
  dietaryPref: string;
  status: string;
  pauseUntil: Date | null;
}

export interface TallyDailyOrderInput {
  customerId: string;
  status: string; // active, skipped, cancelled, extra
  extraItems: string | null;
}

export interface TallyPaymentInput {
  amount: number;
  paidAmount: number;
  status: string; // pending, paid, partial
}

export interface TallyBreakdown {
  totalCustomers: number;
  activeTiffins: number;
  dietary: {
    regular: number;
    jain: number;
    lessOil: number;
    noOnionGarlic: number;
  };
  skippedCount: number;
  cancelledCount: number;
  pausedCount: number;
  extraCount: number;
  extraRequests: Array<{ customerId: string; customerName: string; items: string }>;
  pendingPaymentsTotal: number;
  pendingPaymentsCount: number;
  collectedPaymentsTotal: number;
}

export function computeTallyFromData(
  customers: TallyCustomerInput[],
  dailyOrders: TallyDailyOrderInput[],
  payments: TallyPaymentInput[],
  now: Date = new Date()
): TallyBreakdown {
  const orderMap = new Map<string, TallyDailyOrderInput>();
  for (const order of dailyOrders) {
    orderMap.set(order.customerId, order);
  }

  let activeTiffins = 0;
  let regular = 0;
  let jain = 0;
  let lessOil = 0;
  let noOnionGarlic = 0;
  let skippedCount = 0;
  let cancelledCount = 0;
  let pausedCount = 0;
  let extraCount = 0;
  const extraRequests: Array<{ customerId: string; customerName: string; items: string }> = [];

  for (const customer of customers) {
    const isPausedByStatus = customer.pauseUntil
      ? getTodayUTC(customer.pauseUntil) > getTodayUTC(now)
      : customer.status === "paused";

    if (customer.status === "cancelled") {
      cancelledCount += 1;
      continue;
    }

    if (isPausedByStatus) {
      pausedCount += 1;
      continue;
    }

    const todayOrder = orderMap.get(customer.id);
    if (todayOrder?.status === "skipped") {
      skippedCount += 1;
      continue;
    }
    if (todayOrder?.status === "cancelled") {
      cancelledCount += 1;
      continue;
    }

    activeTiffins += 1;
    switch (customer.dietaryPref) {
      case "jain":
        jain += 1;
        break;
      case "less-oil":
        lessOil += 1;
        break;
      case "no-onion-garlic":
        noOnionGarlic += 1;
        break;
      default:
        regular += 1;
        break;
    }

    if (todayOrder?.status === "extra" || todayOrder?.extraItems) {
      extraCount += 1;
      extraRequests.push({
        customerId: customer.id,
        customerName: customer.name,
        items: todayOrder.extraItems || "Extra item",
      });
    }
  }

  let pendingPaymentsTotal = 0;
  let pendingPaymentsCount = 0;
  let collectedPaymentsTotal = 0;

  for (const payment of payments) {
    collectedPaymentsTotal += payment.paidAmount;
    if (payment.status !== "paid") {
      const remaining = Math.max(0, payment.amount - payment.paidAmount);
      if (remaining > 0) {
        pendingPaymentsTotal += remaining;
        pendingPaymentsCount += 1;
      }
    }
  }

  return {
    totalCustomers: customers.length,
    activeTiffins,
    dietary: {
      regular,
      jain,
      lessOil,
      noOnionGarlic,
    },
    skippedCount,
    cancelledCount,
    pausedCount,
    extraCount,
    extraRequests,
    pendingPaymentsTotal,
    pendingPaymentsCount,
    collectedPaymentsTotal,
  };
}

export async function getDailyTally(targetDate?: Date, db: import("@prisma/client").Prisma.TransactionClient = prisma) {
  const today = targetDate ? new Date(targetDate) : getTodayUTC();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const currentMonth = getCurrentMonthKey();

  const [cook, customers, dailyOrders, payments, recentMessages, newMessagesCount] =
    await Promise.all([
      db.cook.findFirst(),
      db.customer.findMany({ orderBy: { createdAt: "asc" } }),
      db.dailyOrder.findMany({
        where: {
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      db.payment.findMany({
        where: { month: currentMonth },
      }),
      db.message.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.message.count({
        where: { status: "new" },
      }),
    ]);

  const breakdown = computeTallyFromData(customers, dailyOrders, payments, today);

  return {
    date: today.toISOString(),
    month: currentMonth,
    cook: cook
      ? {
          id: cook.id,
          name: cook.name,
          language: cook.language,
          defaultPrice: cook.defaultPrice,
        }
      : null,
    ...breakdown,
    newMessagesCount,
    recentUpdates: recentMessages.map((m) => ({
      id: m.id,
      senderName: m.senderName,
      intent: m.intent,
      status: m.status,
      originalText: m.originalText,
      translatedText: m.translatedText,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}
