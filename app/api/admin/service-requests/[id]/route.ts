import { updateBuyerServiceRequestStatusById } from "@/lib/supabase/buyer-services-repo";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED = new Set(["pending", "matched", "in_progress", "completed", "cancelled"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { status?: string };
    const status = body.status?.trim();
    if (!status || !ALLOWED.has(status)) {
      return NextResponse.json(
        { error: "Invalid status. Use pending, matched, in_progress, completed, or cancelled." },
        { status: 400 },
      );
    }
    const updated = await updateBuyerServiceRequestStatusById(
      id,
      status as "pending" | "matched" | "in_progress" | "completed" | "cancelled",
    );
    if (!updated) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update service request";
    console.error("[PATCH /api/admin/service-requests/:id]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
