import { getCustomerConciergeContext } from "@/lib/concierge-context";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customerId")?.trim() ?? "";
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }
    const context = await getCustomerConciergeContext(customerId);
    return NextResponse.json(context);
  } catch (error) {
    console.error("GET /api/buyer/concierge-context failed:", error);
    return NextResponse.json({ error: "Failed to load concierge context" }, { status: 500 });
  }
}
