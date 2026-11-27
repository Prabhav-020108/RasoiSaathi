import { NextResponse } from "next/server";
import { getDailyTally } from "@/lib/tally";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tally = await getDailyTally();
    return NextResponse.json(tally);
  } catch (error) {
    console.error("GET /api/tally failed:", error);
    return NextResponse.json({ error: "Failed to compute daily tally" }, { status: 500 });
  }
}
