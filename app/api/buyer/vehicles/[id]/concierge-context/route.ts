import { getVehicleConciergeContext } from "@/lib/concierge-context";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const customerId = req.nextUrl.searchParams.get("customerId")?.trim() ?? "";
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }
    const result = await getVehicleConciergeContext(id, customerId);
    if (result.error === "not_found") {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    if (result.error === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(result.context);
  } catch (error) {
    console.error("GET /api/buyer/vehicles/[id]/concierge-context failed:", error);
    return NextResponse.json({ error: "Failed to load concierge context" }, { status: 500 });
  }
}
