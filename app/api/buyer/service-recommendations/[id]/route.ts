import { updateBuyerServiceRecommendationStatus } from "@/lib/db";
import type { RecommendationStatus } from "@/lib/buyer-control-center";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const customerId = String(body?.customerId ?? "").trim();
    const status = body?.status as RecommendationStatus;

    if (!customerId || !status) {
      return NextResponse.json({ error: "customerId and status are required" }, { status: 400 });
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await updateBuyerServiceRecommendationStatus(id, customerId, status);
    if (!updated) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[buyer/service-recommendations]", error);
    return NextResponse.json({ error: "Failed to update recommendation" }, { status: 500 });
  }
}
