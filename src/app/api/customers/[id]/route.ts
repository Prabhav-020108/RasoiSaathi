import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        payments: { orderBy: { month: "desc" } },
        dailyOrders: { orderBy: { date: "desc" }, take: 14 },
        messages: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("GET /api/customers/[id] failed:", error);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      data.name = trimmed;
    }
    if (body.phone !== undefined) {
      data.phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    }
    if (typeof body.language === "string" && body.language.trim()) {
      data.language = body.language.trim();
    }
    if (typeof body.dietaryPref === "string" && body.dietaryPref.trim()) {
      data.dietaryPref = body.dietaryPref.trim();
    }
    if (body.monthlyPrice !== undefined) {
      const price = Number(body.monthlyPrice);
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: "Invalid monthlyPrice" }, { status: 400 });
      }
      data.monthlyPrice = Math.round(price);
    }
    if (body.pauseUntil !== undefined) {
      if (body.pauseUntil === null || body.pauseUntil === "") {
        data.pauseUntil = null;
      } else if (typeof body.pauseUntil === "string" || typeof body.pauseUntil === "number") {
        const parsedDate = new Date(body.pauseUntil);
        if (Number.isNaN(parsedDate.getTime())) {
          return NextResponse.json({ error: "Invalid pauseUntil date" }, { status: 400 });
        }
        data.pauseUntil = parsedDate;
      } else {
        return NextResponse.json({ error: "Invalid pauseUntil date" }, { status: 400 });
      }
    }
    if (typeof body.status === "string") {
      if (!["active", "paused", "cancelled"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = body.status;
      if (body.status === "active" || body.status === "cancelled") {
        data.pauseUntil = null;
      }
    }
    if (body.specialNotes !== undefined) {
      data.specialNotes =
        typeof body.specialNotes === "string" && body.specialNotes.trim()
          ? body.specialNotes.trim()
          : null;
    }

    const updated = await prisma.customer.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ customer: updated });
  } catch (error) {
    console.error("PUT /api/customers/[id] failed:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await prisma.customer.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true, id: params.id });
  } catch (error) {
    console.error("DELETE /api/customers/[id] failed:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
