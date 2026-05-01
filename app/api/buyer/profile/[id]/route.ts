import { deleteCustomer, getBuyerProfile, updateCustomer } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const profile = await getBuyerProfile(id);
    if (!profile) {
      return NextResponse.json({ error: "Buyer profile not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch buyer profile" }, { status: 500 });
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
    if (body?.name !== undefined) patch.name = String(body.name ?? "").trim();
    if (body?.email !== undefined) patch.email = String(body.email ?? "").trim();
    if (body?.phone !== undefined) patch.phone = String(body.phone ?? "").trim();
    if (body?.address !== undefined) patch.address = String(body.address ?? "").trim();

    const updated = await updateCustomer(id, patch as any);
    if (!updated) {
      return NextResponse.json({ error: "Buyer profile not found" }, { status: 404 });
    }

    const profile = await getBuyerProfile(id);
    return NextResponse.json(profile ?? { customer: updated });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to update buyer profile" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const deleted = await deleteCustomer(id);
    if (!deleted) {
      return NextResponse.json({ error: "Buyer profile not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to delete buyer profile" }, { status: 500 });
  }
}

