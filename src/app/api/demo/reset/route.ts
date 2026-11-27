import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/seed-db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await seedDatabase(prisma, { force: true });
    return NextResponse.json({ reset: true, ...result });
  } catch (error) {
    console.error("POST /api/demo/reset failed:", error);
    return NextResponse.json({ error: "Failed to reset demo data" }, { status: 500 });
  }
}
