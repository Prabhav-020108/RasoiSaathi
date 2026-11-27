import { prisma } from "./prisma";
import { getCurrentMonthKey } from "./utils";
import { executeVoiceIntent, resolveCustomerMatches } from "./voice-actions";
import type { ParsedCommand } from "./voice-fallback";
import { kitchenCopy } from "./kitchen-language";

interface ApprovalRequest {
  parsed: ParsedCommand;
  cookLang: string;
  tierUsed: "basic" | "gemini" | "local";
  originalText: string;
  customerId?: string;
  expectedBalance?: number;
  reminderPaymentIds?: string[];
  month: string;
}

export async function prepareVoiceApproval(request: Omit<ApprovalRequest, "month">) {
  const { parsed, cookLang, originalText, tierUsed } = request;
  const month = getCurrentMonthKey();
  const response = {
    intent: parsed.intent, entities: parsed.entities, confidence: parsed.confidence,
    tierUsed, actionPerformed: false,
  };
  const customers = await prisma.customer.findMany();
  let label: string;
  if (parsed.intent === "payment_remind" && !parsed.entities.customerName) {
    const bills = await prisma.payment.findMany({
      where: { month, status: { not: "paid" } }, include: { customer: true },
    });
    request.reminderPaymentIds = bills.map((bill) => bill.id);
    label = bills.map((bill) => `${bill.customer.name}, ₹${bill.amount - bill.paidAmount}`).join(". ");
    if (!label) return { ...response, responseText: "₹0" };
  } else {
    const matches = resolveCustomerMatches(parsed.entities.customerName, originalText,
      customers.map((customer) => ({
        ...customer, phoneLast4: customer.phone?.replace(/\D/g, "").slice(-4) ?? "",
      })));
    if (matches.length !== 1) {
      return {
        ...response,
        needsDisambiguation: matches.length > 1,
        needsCustomerName: matches.length === 0,
        candidates: matches.length > 1 ? matches.map(({ id, name, phoneLast4 }) => ({ id, name, phoneLast4 })) : undefined,
        responseText: matches.length > 1
          ? matches.map(({ name, phoneLast4 }) => `${name} ${phoneLast4.split("").join(" ")}`).join(". ")
          : kitchenCopy(cookLang).retry,
      };
    }
    const customer = matches[0];
    request.customerId = customer.id;
    label = customer.name;
    if (parsed.intent === "payment_record") {
      const bill = await prisma.payment.findUnique({ where: { customerId_month: { customerId: customer.id, month } } });
      const due = bill ? bill.amount - bill.paidAmount : 0;
      const amount = parsed.entities.paymentAmount ?? due;
      if (!bill || amount <= 0 || amount > due) {
        return { ...response, responseText: `${customer.name}. ₹${due}. ${kitchenCopy(cookLang).pending}` };
      }
      request.expectedBalance = due;
      label = `${customer.name}. ₹${amount}.`;
    }
  }
  await prisma.voiceApproval.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const confirmation = await prisma.voiceApproval.create({
    data: { request: JSON.stringify({ ...request, month }), expiresAt: new Date(Date.now() + 120_000) },
  });
  return {
    ...response, confirmationToken: confirmation.id,
    responseText: `${label} ${kitchenCopy(cookLang).approve}`,
  };
}

export async function confirmVoiceApproval(id: string) {
  return prisma.$transaction(async (db) => {
    const confirmation = await db.voiceApproval.findUnique({ where: { id } });
    if (!confirmation || confirmation.expiresAt < new Date()) return null;
    if (confirmation.result) return JSON.parse(confirmation.result);
    const request: ApprovalRequest = JSON.parse(confirmation.request);
    if (request.month !== getCurrentMonthKey()) return null;
    const result = await executeVoiceIntent(request.parsed, {
      ...request, db, receiptId: id,
    });
    const response = { ...result, tierUsed: request.tierUsed };
    await db.voiceApproval.update({ where: { id }, data: { result: JSON.stringify(response) } });
    return response;
  });
}
