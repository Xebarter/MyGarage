import { getVendor, getVendorAnalytics } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * Admin workspace: vendor profile + analytics in one response (avoids duplicate
 * round-trips and matches server route param typing for Next.js 15+).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const vendorId = String(id ?? "").trim();
    if (!vendorId) {
      return NextResponse.json({ error: "Vendor id is required" }, { status: 400 });
    }

    const vendor = await getVendor(vendorId);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const analytics = await getVendorAnalytics(vendorId);
    return NextResponse.json({ vendor, analytics });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load vendor analytics";
    console.error("[GET /api/admin/vendors/:id/analytics]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
