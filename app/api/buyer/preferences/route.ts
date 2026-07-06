import { updateBuyerAppPreferences } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("customerId")?.trim();
  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }

  const { getBuyerAppPreferences } = await import("@/lib/db");
  const prefs = await getBuyerAppPreferences(customerId);
  return NextResponse.json(prefs);
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const customerId = String(body?.customerId ?? "").trim();
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const updated = await updateBuyerAppPreferences(customerId, {
      preferredProviderIds: body.preferredProviderIds,
      serviceMode: body.serviceMode,
      language: body.language,
      region: body.region,
      distanceUnit: body.distanceUnit,
      currency: body.currency,
      theme: body.theme,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[buyer/preferences]", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
