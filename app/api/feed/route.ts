import { getCustomerByEmail, getHomeFeed } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const customerIdParam = (searchParams.get("customerId") || "").trim();
    const customerEmail = (searchParams.get("customerEmail") || "").trim();
    const forceRefreshParam = (searchParams.get("forceRefresh") || "").trim().toLowerCase();
    const forceRefresh = ["1", "true", "yes", "y"].includes(forceRefreshParam);
    const limitParam = Number(searchParams.get("limit") || "80");
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 400) : 80;

    let resolvedCustomerId = customerIdParam;
    if (!resolvedCustomerId && customerEmail) {
      try {
        const customer = await getCustomerByEmail(customerEmail);
        resolvedCustomerId = customer?.id ?? "";
      } catch (lookupError) {
        console.error("GET /api/feed customer lookup:", lookupError);
        resolvedCustomerId = "";
      }
    }

    const feed = await getHomeFeed(resolvedCustomerId || undefined, limit, { forceRefresh });
    return NextResponse.json(feed);
  } catch (error) {
    console.error("GET /api/feed:", error);
    return NextResponse.json({ error: "Failed to fetch home feed" }, { status: 500 });
  }
}
