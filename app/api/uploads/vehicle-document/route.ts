import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const VEHICLE_DOCUMENTS_BUCKET = "vehicle-documents";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "application/pdf") return "pdf";
  return "jpg";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid type. Use JPEG, PNG, WebP, GIF, or PDF." },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File must be 10 MB or smaller" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extensionForMime(file.type);
    const path = `documents/${Date.now()}-${randomUUID()}.${ext}`;

    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(VEHICLE_DOCUMENTS_BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error("[vehicle-document upload]", error.message);
      return NextResponse.json(
        {
          error:
            "Upload failed. Create the vehicle-documents bucket (run migration 041_vehicle_documents_storage.sql).",
        },
        { status: 500 },
      );
    }

    const { url } = getSupabasePublicEnv();
    const publicUrl = `${url}/storage/v1/object/public/${VEHICLE_DOCUMENTS_BUCKET}/${path}`;
    return NextResponse.json({ url: publicUrl, storagePath: path });
  } catch (e) {
    console.error("[vehicle-document upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
