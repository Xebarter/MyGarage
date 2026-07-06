import { markBuyerNotificationRead, markAllBuyerNotificationsRead } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const customerId = String(body?.customerId ?? "").trim();
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    if (body?.markAll) {
      await markAllBuyerNotificationsRead(customerId);
      return NextResponse.json({ success: true });
    }

    const notificationId = String(body?.notificationId ?? "").trim();
    if (!notificationId) {
      return NextResponse.json({ error: "notificationId is required" }, { status: 400 });
    }

    const ok = await markBuyerNotificationRead(notificationId, customerId);
    if (!ok) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[buyer/notifications]", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
