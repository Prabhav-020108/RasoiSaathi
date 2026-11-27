import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentMonthKey } from "./utils";

export async function ensureMonthlyBills() {
  const month = getCurrentMonthKey();
  const customers = await prisma.customer.findMany({
    where: { status: { in: ["active", "paused"] }, payments: { none: { month } } },
    select: { id: true, monthlyPrice: true },
  });
  if (!customers.length) return;
  await prisma.$transaction(customers.map((customer) => prisma.payment.upsert({
    where: { customerId_month: { customerId: customer.id, month } },
    update: {},
    create: { customerId: customer.id, month, amount: customer.monthlyPrice },
  })));
}

export async function recordReceipt(db: Prisma.TransactionClient, paymentId: string, amount: number, receiptId: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return null;
  const previous = await db.paymentReceipt.findUnique({ where: { id: receiptId } });
  if (previous) {
    if (previous.paymentId !== paymentId || previous.amount !== amount) return null;
    return { payment, repeated: true };
  }
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > payment.amount - payment.paidAmount) return null;
  const paidAmount = payment.paidAmount + amount;
  await db.paymentReceipt.create({ data: { id: receiptId, amount, paymentId } });
  const updated = await db.payment.update({
    where: { id: paymentId },
    data: { paidAmount, status: paidAmount === payment.amount ? "paid" : "partial", paidAt: new Date() },
  });
  return { payment: updated, repeated: false };
}
