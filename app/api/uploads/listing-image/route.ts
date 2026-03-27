import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
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
        { error: "Invalid type. Use JPEG, PNG, WebP, or GIF." },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extensionForMime(file.type);
    const path = `listings/${Date.now()}-${randomUUID()}.${ext}`;

    const supabase = createAdminClient();
    const { error } = await supabase.storage.from("listing-images").upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error("[listing-image upload]", error.message);
      return NextResponse.json(
        {
          error:
            "Upload failed. Create the listing-images bucket (see migration 017_listing_images_storage.sql).",
        },
        { status: 500 },
      );
    }

    const { url } = getSupabasePublicEnv();
    const publicUrl = `${url}/storage/v1/object/public/listing-images/${path}`;
    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    console.error("[listing-image upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
