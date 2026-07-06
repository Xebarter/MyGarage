import { createBuyerVehicleDocument, listBuyerVehicleDocuments } from "@/lib/db";
import type { DocumentType } from "@/lib/buyer-control-center";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customerId")?.trim();
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }
    const documents = await listBuyerVehicleDocuments(customerId);
    return NextResponse.json(documents);
  } catch (error) {
    console.error("[buyer/vehicle-documents GET]", error);
    return NextResponse.json({ error: "Failed to list documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const customerId = String(body?.customerId ?? "").trim();
    const vehicleId = String(body?.vehicleId ?? "").trim();
    const name = String(body?.name ?? "").trim();

    if (!customerId || !vehicleId || !name) {
      return NextResponse.json({ error: "customerId, vehicleId, and name are required" }, { status: 400 });
    }

    const document = await createBuyerVehicleDocument({
      customerId,
      vehicleId,
      documentType: (body.documentType as DocumentType) ?? "other",
      name,
      fileUrl: body.fileUrl ? String(body.fileUrl) : null,
      storagePath: body.storagePath ? String(body.storagePath) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("[buyer/vehicle-documents POST]", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
