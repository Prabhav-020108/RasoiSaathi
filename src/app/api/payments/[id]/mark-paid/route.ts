import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordReceipt } from "@/lib/payment-receipts";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { customer: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    if (existing.status === "paid") {
      return NextResponse.json({
        alreadyPaid: true,
        payment: existing,
        message: `${existing.customer.name} ka payment pehle se paid hai.`,
      });
    }

    const updated = await prisma.$transaction((db) =>
      recordReceipt(db, params.id, existing.amount - existing.paidAmount, `full-${params.id}`)
    );
    if (!updated) return NextResponse.json({ error: "Balance changed. Refresh and try again." }, { status: 409 });

    return NextResponse.json({ alreadyPaid: updated.repeated, payment: { ...updated.payment, customer: existing.customer } });
  } catch (error) {
    console.error("POST /api/payments/[id]/mark-paid failed:", error);
    return NextResponse.json({ error: "Failed to mark payment paid" }, { status: 500 });
  }
}
