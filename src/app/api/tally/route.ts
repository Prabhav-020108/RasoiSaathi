import { NextRequest, NextResponse } from "next/server";
import { getDailyTally } from "@/lib/tally";
import { ensureMonthlyBills } from "@/lib/payment-receipts";
import { getTodayUTC } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await ensureMonthlyBills();
    const day = getTodayUTC();
    if (request.nextUrl.searchParams.get("day") === "tomorrow") day.setUTCDate(day.getUTCDate() + 1);
    const tally = await getDailyTally(day);
    return NextResponse.json(tally);
  } catch (error) {
    console.error("GET /api/tally failed:", error);
    return NextResponse.json({ error: "Failed to compute daily tally" }, { status: 500 });
  }
}
