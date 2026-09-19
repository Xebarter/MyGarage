import { NextRequest, NextResponse } from "next/server";
import { executeConciergeAction } from "@/lib/concierge/act";
import type { ConciergePendingAction } from "@/lib/concierge/types";

function parseAction(value: unknown): ConciergePendingAction | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (rec.type === "quote") {
    const lines = Array.isArray(rec.lines) ? rec.lines : [];
    const parsed = lines
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const line = row as Record<string, unknown>;
        const productId = String(line.productId ?? "").trim();
        if (!productId) return null;
        return {
          productId,
          name: String(line.name ?? ""),
          price: Number(line.price) || 0,
          image: String(line.image ?? ""),
          quantity: Math.max(1, Math.round(Number(line.quantity) || 1)),
          vendorId: typeof line.vendorId === "string" ? line.vendorId : undefined,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    if (parsed.length === 0) return null;
    return { type: "quote", lines: parsed };
  }
  if (rec.type === "book") {
    const service = String(rec.service ?? "").trim();
    if (!service) return null;
    return {
      type: "book",
      categoryId: String(rec.categoryId ?? "").trim(),
      category: String(rec.category ?? "").trim(),
      service,
      vehicleId: typeof rec.vehicleId === "string" && rec.vehicleId.trim() ? rec.vehicleId.trim() : null,
      notes: typeof rec.notes === "string" ? rec.notes.trim() : "",
      location: typeof rec.location === "string" ? rec.location.trim() : "",
    };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = parseAction(body.action ?? body.pendingAction);
    if (!action) {
      return NextResponse.json({ error: "A quote or booking to confirm is required." }, { status: 400 });
    }
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    const locationOverride = typeof body.location === "string" ? body.location.trim() : "";
    const phoneOverride = typeof body.phone === "string" ? body.phone.trim() : "";

    const result = await executeConciergeAction({
      customerId,
      action,
      locationOverride,
      phoneOverride,
    });

    if (!result.ok) {
      const status =
        result.code === "SIGN_IN_REQUIRED"
          ? 401
          : result.code === "FORBIDDEN"
            ? 403
            : result.code === "CUSTOMER_NOT_FOUND" || result.code === "VEHICLE_NOT_FOUND"
              ? 404
              : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/buyer/concierge/act failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to complete that action." }, { status: 500 });
  }
}
