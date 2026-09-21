import { NextRequest, NextResponse } from "next/server";
import { getBuyerAddresses, getCustomer } from "@/lib/db";
import { getCustomerConciergeContext, getVehicleConciergeContext } from "@/lib/concierge-context";
import { classifyGrokError, isGrokConfigured, runConciergeChat } from "@/lib/concierge/grok";
import type { ConciergeChatTurn } from "@/lib/concierge/types";

function parseHistory(value: unknown): ConciergeChatTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: ConciergeChatTurn[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const role = rec.role === "assistant" ? "assistant" : rec.role === "user" ? "user" : null;
    const content = typeof rec.content === "string" ? rec.content.trim() : "";
    const imageUrl = typeof rec.imageUrl === "string" ? rec.imageUrl.trim() : "";
    if (!role || (!content && !imageUrl)) continue;
    turns.push({ role, content: content || (imageUrl ? "I attached a photo of my car." : ""), ...(imageUrl ? { imageUrl } : {}) });
  }
  return turns.slice(-12);
}

export async function POST(req: NextRequest) {
  try {
    if (!isGrokConfigured()) {
      return NextResponse.json(
        { error: "Concierge is not configured yet.", code: "GROK_UNAVAILABLE", configured: false },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message && !imageUrl) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    const vehicleId = typeof body.vehicleId === "string" ? body.vehicleId.trim() : "";
    const history = parseHistory(body.history);

    let contextJson = JSON.stringify({ guest: true, signedIn: false });
    let canBook = false;
    let signedIn = false;
    let defaultLocation = "";
    let defaultVehicleId: string | null = null;
    let vehicleHint = "";
    let vehicles: Array<{
      id: string;
      make?: string;
      model?: string;
      year?: number;
      nickname?: string | null;
      licensePlate?: string | null;
    }> = [];

    if (customerId) {
      const customer = await getCustomer(customerId);
      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      canBook = true;
      signedIn = true;
      const addresses = await getBuyerAddresses(customerId);
      const defaultAddress = addresses.find((row) => row.isDefault) ?? addresses[0];
      defaultLocation = defaultAddress?.fullAddress?.trim() || customer.address?.trim() || "";

      if (vehicleId) {
        const scoped = await getVehicleConciergeContext(vehicleId, customerId);
        if (scoped.error === "not_found") {
          return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
        }
        if (scoped.error === "forbidden") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (scoped.error || !scoped.context) {
          return NextResponse.json({ error: "Failed to load vehicle context" }, { status: 500 });
        }
        contextJson = JSON.stringify({
          signedIn: true,
          customer: { name: customer.name, phoneSet: Boolean(customer.phone), addressSet: Boolean(customer.address) },
          defaultLocation,
          vehicleContext: scoped.context,
        });
        defaultVehicleId = scoped.context.vehicle.id;
        const v = scoped.context.vehicle;
        vehicles = [v];
        vehicleHint = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
      } else {
        const ctx = await getCustomerConciergeContext(customerId);
        contextJson = JSON.stringify({
          signedIn: true,
          customer: { name: customer.name, phoneSet: Boolean(customer.phone), addressSet: Boolean(customer.address) },
          defaultLocation,
          vehicles: ctx.vehicles,
          primary: ctx.primary,
        });
        defaultVehicleId = ctx.primary?.vehicle.id ?? ctx.vehicles[0]?.id ?? null;
        vehicles = ctx.vehicles;
        const v = ctx.primary?.vehicle ?? ctx.vehicles[0];
        if (v) vehicleHint = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
      }
    }

    const result = await runConciergeChat({
      message: message || (imageUrl ? "I attached a photo of my car." : ""),
      history,
      contextJson,
      canBook,
      signedIn,
      customerId: customerId || null,
      defaultLocation,
      defaultVehicleId,
      vehicleHint,
      vehicles,
      imageUrl: imageUrl || null,
    });

    return NextResponse.json({
      reply: result.reply,
      pendingAction: result.pendingAction,
      productBrowse: result.productBrowse,
      productDetail: result.productDetail,
      shopCategories: result.shopCategories,
      orderBrowse: result.orderBrowse,
      bookingBrowse: result.bookingBrowse,
      configured: true,
    });
  } catch (error) {
    console.error("POST /api/buyer/concierge/chat failed:", error);
    const message = error instanceof Error ? error.message : "";
    if (message === "GROK_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Concierge is not configured yet.", code: "GROK_UNAVAILABLE", configured: false },
        { status: 503 },
      );
    }
    const failure = classifyGrokError(error);
    return NextResponse.json(
      { error: failure.error, code: failure.code, configured: true },
      { status: failure.status },
    );
  }
}
