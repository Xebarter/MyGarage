import { updateBuyerNotificationPreferences } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("customerId")?.trim();
  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }

  const { getBuyerNotificationPreferences } = await import("@/lib/db");
  const prefs = await getBuyerNotificationPreferences(customerId);
  return NextResponse.json(prefs);
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const customerId = String(body?.customerId ?? "").trim();
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const updated = await updateBuyerNotificationPreferences(customerId, {
      emailEnabled: body.emailEnabled,
      smsEnabled: body.smsEnabled,
      inAppEnabled: body.inAppEnabled,
      serviceUpdates: body.serviceUpdates,
      maintenanceReminders: body.maintenanceReminders,
      marketing: body.marketing,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[buyer/notification-preferences]", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
