import { NextRequest, NextResponse } from "next/server";
import { executeConciergeAction } from "@/lib/concierge/act";
import {
  addressCreateAction,
  authHref,
  navigateAction,
  profileUpdateAction,
  resolveConciergeDestination,
  vehicleCreateAction,
  vehicleDraftFromArgs,
  vehicleUpdateAction,
} from "@/lib/concierge/guides";
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
  if (rec.type === "navigate") {
    const dest = resolveConciergeDestination(String(rec.destination ?? rec.title ?? ""));
    if (!dest) return null;
    return navigateAction(dest, {
      href: typeof rec.href === "string" ? rec.href : dest.href,
      hrefMobile: typeof rec.hrefMobile === "string" ? rec.hrefMobile : dest.hrefMobile,
    });
  }
  if (rec.type === "auth") {
    return authHref(typeof rec.next === "string" ? rec.next : "/buyer");
  }
  if (rec.type === "vehicle_create") {
    const created = vehicleCreateAction(vehicleDraftFromArgs(rec));
    return "error" in created ? null : created;
  }
  if (rec.type === "vehicle_update") {
    const vehicleId = String(rec.vehicleId ?? "").trim();
    if (!vehicleId) return null;
    const updates = rec.updates && typeof rec.updates === "object" ? (rec.updates as Record<string, unknown>) : rec;
    const updated = vehicleUpdateAction({
      vehicleId,
      label: String(rec.label ?? "your car"),
      args: updates,
    });
    return "error" in updated ? null : updated;
  }
  if (rec.type === "profile_update") {
    const next = profileUpdateAction(rec);
    return "error" in next ? null : next;
  }
  if (rec.type === "address_create") {
    const next = addressCreateAction(rec);
    return "error" in next ? null : next;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = parseAction(body.action ?? body.pendingAction);
    if (!action) {
      return NextResponse.json({ error: "A confirmed action is required." }, { status: 400 });
    }
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    const locationOverride = typeof body.location === "string" ? body.location.trim() : "";
    const phoneOverride = typeof body.phone === "string" ? body.phone.trim() : "";
    const destinationLat = body.destinationLat != null ? Number(body.destinationLat) : null;
    const destinationLng = body.destinationLng != null ? Number(body.destinationLng) : null;

    const result = await executeConciergeAction({
      customerId,
      action,
      locationOverride,
      phoneOverride,
      destinationLat: Number.isFinite(destinationLat) ? destinationLat : null,
      destinationLng: Number.isFinite(destinationLng) ? destinationLng : null,
    });

    if (!result.ok) {
      const status =
        result.code === "SIGN_IN_REQUIRED"
          ? 401
          : result.code === "FORBIDDEN"
            ? 403
            : result.code === "CUSTOMER_NOT_FOUND" || result.code === "VEHICLE_NOT_FOUND"
              ? 404
              : result.code === "ACTIVE_REQUEST_EXISTS"
                ? 409
                : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/buyer/concierge/act failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to complete that action." }, { status: 500 });
  }
}
