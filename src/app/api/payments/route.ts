import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentMonth = getCurrentMonthKey();
    const payments = await prisma.payment.findMany({
      where: { month: currentMonth },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            language: true,
            status: true,
            dietaryPref: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    });

    let collected = 0;
    let pending = 0;
    let pendingCount = 0;
    let paidCount = 0;

    for (const p of payments) {
      collected += p.paidAmount;
      if (p.status === "paid") {
        paidCount += 1;
      } else {
        const remaining = Math.max(0, p.amount - p.paidAmount);
        pending += remaining;
        if (remaining > 0) pendingCount += 1;
      }
    }

    return NextResponse.json({
      month: currentMonth,
      summary: {
        collected,
        pending,
        pendingCount,
        paidCount,
        totalCount: payments.length,
      },
      payments,
    });
  } catch (error) {
    console.error("GET /api/payments failed:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
