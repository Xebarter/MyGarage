import { deleteBuyerSupportTicket, getBuyerSupportTicket, updateBuyerSupportTicket } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ticket = await getBuyerSupportTicket(id);
    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }
    return NextResponse.json(ticket);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch support ticket" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const patch: Record<string, unknown> = {};
    if (body?.subject !== undefined) patch.subject = String(body.subject ?? "").trim();
    if (body?.message !== undefined) patch.message = String(body.message ?? "").trim();
    if (body?.orderId !== undefined) patch.orderId = String(body.orderId ?? "").trim() || undefined;
    if (body?.status !== undefined) patch.status = body.status;
    if (body?.priority !== undefined) patch.priority = body.priority;

    const updated = await updateBuyerSupportTicket(id, patch as any);
    if (!updated) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to update support ticket" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const deleted = await deleteBuyerSupportTicket(id);
    if (!deleted) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to delete support ticket" }, { status: 500 });
  }
}

