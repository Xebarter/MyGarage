import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "vendor-avatars";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

async function resolveUser(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.getUser(token);
      if (!error && data.user) return data.user;
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

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
    const path = `avatars/${user.id}/${Date.now()}-${randomUUID()}.${ext}`;

    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error("[vendor-avatar upload]", error.message);
      return NextResponse.json(
        {
          error:
            "Upload failed. Create the vendor-avatars bucket (run migration 044_vendor_profile_image.sql).",
        },
        { status: 500 },
      );
    }

    const { url } = getSupabasePublicEnv();
    const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${path}`;
    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    console.error("[vendor-avatar upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
