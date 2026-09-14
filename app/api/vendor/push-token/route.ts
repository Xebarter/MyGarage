import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deleteVendorPushToken, upsertVendorPushToken } from "@/lib/supabase/vendor-push-tokens-repo";

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
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const platform = typeof body?.platform === "string" ? body.platform.trim() : "android";
    if (token.length < 8) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }
    await upsertVendorPushToken({ vendorId: user.id, token, platform });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/vendor/push-token:", error);
    return NextResponse.json({ error: "Failed to save push token" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const tokenFromQuery = searchParams.get("token")?.trim() || "";
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const token = (typeof body?.token === "string" ? body.token.trim() : "") || tokenFromQuery;
    await deleteVendorPushToken(user.id, token || undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/vendor/push-token:", error);
    return NextResponse.json({ error: "Failed to remove push token" }, { status: 500 });
  }
}
