import { deleteBuyerVehicleDocument } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const customerId = req.nextUrl.searchParams.get("customerId")?.trim();
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const deleted = await deleteBuyerVehicleDocument(id, customerId);
    if (!deleted) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[buyer/vehicle-documents DELETE]", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
