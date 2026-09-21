import { NextRequest, NextResponse } from "next/server";

import { userHasAdminAccess } from "@/lib/auth-admin";
import { createClient } from "@/lib/supabase/server";
import { deleteAdminPushToken, upsertAdminPushToken } from "@/lib/supabase/admin-push-tokens-repo";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !userHasAdminAccess(user)) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const platform = typeof body?.platform === "string" ? body.platform.trim() : "web";
    if (token.length < 8) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    await upsertAdminPushToken({ userId: user.id, token, platform });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/push-token:", error);
    return NextResponse.json({ error: "Failed to save push token" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !userHasAdminAccess(user)) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tokenFromQuery = searchParams.get("token")?.trim() || "";
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const token = (typeof body?.token === "string" ? body.token.trim() : "") || tokenFromQuery;
    await deleteAdminPushToken(user.id, token || undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/push-token:", error);
    return NextResponse.json({ error: "Failed to remove push token" }, { status: 500 });
  }
}
