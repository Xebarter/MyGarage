import { activateBuyerSubscriptionByCheckout } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/** Called after Paytota success redirect to activate a pending subscription. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const checkoutId = String(body?.checkoutId ?? "").trim();
    if (!checkoutId) {
      return NextResponse.json({ error: "checkoutId is required" }, { status: 400 });
    }

    const subscription = await activateBuyerSubscriptionByCheckout(checkoutId);
    if (!subscription) {
      return NextResponse.json({ error: "No pending subscription for this checkout" }, { status: 404 });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("[buyer/subscriptions/activate]", error);
    return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
  }
}
