import { updateBuyerAccountDetails } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const customerId = String(body?.customerId ?? "").trim();
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    await updateBuyerAccountDetails(customerId, {
      preferredContactMethod: body.preferredContactMethod,
      accountStatus: body.accountStatus,
    });

    const { getBuyerAccountDetails } = await import("@/lib/db");
    const account = await getBuyerAccountDetails(customerId);
    return NextResponse.json(account);
  } catch (error) {
    console.error("[buyer/account]", error);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
