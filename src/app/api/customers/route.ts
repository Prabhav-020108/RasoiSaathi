import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthKey, getTodayUTC } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim();
    const search = searchParams.get("search")?.trim().toLowerCase();

    const currentMonth = getCurrentMonthKey();
    const today = getTodayUTC();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const customers = await prisma.customer.findMany({
      where: status && status !== "all" ? { status } : undefined,
      include: {
        payments: {
          where: { month: currentMonth },
          take: 1,
        },
        dailyOrders: {
          where: {
            date: { gte: today, lt: tomorrow },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const filtered = search
      ? customers.filter(
          (c) =>
            c.name.toLowerCase().includes(search) ||
            (c.phone && c.phone.toLowerCase().includes(search)) ||
            c.dietaryPref.toLowerCase().includes(search)
        )
      : customers;

    return NextResponse.json({
      customers: filtered.map((c) => ({
        ...c,
        currentPayment: c.payments[0] ?? null,
        todayOrder: c.dailyOrders[0] ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/customers failed:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const monthlyPrice = Number(body.monthlyPrice ?? 3000);
    if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0) {
      return NextResponse.json({ error: "Valid monthlyPrice is required" }, { status: 400 });
    }

    const language = typeof body.language === "string" && body.language.trim() ? body.language.trim() : "hi";
    const dietaryPref =
      typeof body.dietaryPref === "string" && body.dietaryPref.trim()
        ? body.dietaryPref.trim()
        : "regular";
    const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    const specialNotes =
      typeof body.specialNotes === "string" && body.specialNotes.trim()
        ? body.specialNotes.trim()
        : null;
    const status =
      typeof body.status === "string" && ["active", "paused", "cancelled"].includes(body.status)
        ? body.status
        : "active";

    let cook = await prisma.cook.findFirst();
    if (!cook) {
      cook = await prisma.cook.create({
        data: {
          name: "Sunita Devi",
          phone: "+91 98765 43210",
          language: "hi",
          defaultPrice: 3000,
        },
      });
    }

    const currentMonth = getCurrentMonthKey();

    const customer = await prisma.customer.create({
      data: {
        cookId: cook.id,
        name,
        phone,
        language,
        dietaryPref,
        monthlyPrice: Math.round(monthlyPrice),
        status,
        specialNotes,
        payments: {
          create: {
            month: currentMonth,
            amount: Math.round(monthlyPrice),
            status: "pending",
            paidAmount: 0,
          },
        },
      },
      include: {
        payments: {
          where: { month: currentMonth },
          take: 1,
        },
      },
    });

    return NextResponse.json(
      {
        customer: {
          ...customer,
          currentPayment: customer.payments[0] ?? null,
          todayOrder: null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/customers failed:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
