import { getAdminCommerceFeed } from "@/lib/admin-commerce-feed";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { items, notes } = await getAdminCommerceFeed();
    return NextResponse.json({ items, notes });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load commerce feed";
    console.error("[GET /api/admin/orders]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
