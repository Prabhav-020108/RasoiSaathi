import { NextResponse } from "next/server";
import { recordReceipt } from "@/lib/payment-receipts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  const amount: unknown = body?.amount;
  const receiptId: unknown = body?.receiptId;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0 ||
      typeof receiptId !== "string" || !/^[a-z0-9-]{16,80}$/i.test(receiptId)) {
    return NextResponse.json({ error: "Enter a positive whole-rupee amount and a receipt ID." }, { status: 400 });
  }
  try {
    const result = await prisma.$transaction((db) => recordReceipt(db, params.id, amount, receiptId));
    return result ? NextResponse.json(result) : NextResponse.json({ error: "Check the remaining balance and amount." }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "Could not record the receipt. Try again." }, { status: 503 });
  }
}
