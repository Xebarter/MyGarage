import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { userHasAdminAccess } from "@/lib/auth-admin";
import {
  getContactMessageStats,
  isContactMessageStatus,
  listContactMessages,
  serializeContactMessage,
  type ContactMessageStatus,
} from "@/lib/supabase/contact-messages-repo";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !userHasAdminAccess(user)) return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusRaw = String(searchParams.get("status") ?? "all").trim();
    const status: ContactMessageStatus | "all" =
      statusRaw === "all" || !statusRaw ? "all" : isContactMessageStatus(statusRaw) ? statusRaw : "all";
    const search = String(searchParams.get("q") ?? "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSizeRaw = parseInt(searchParams.get("pageSize") || "50", 10) || 50;
    const pageSize = Math.min(100, Math.max(1, pageSizeRaw));

    const [result, stats] = await Promise.all([
      listContactMessages({
        status,
        search,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      getContactMessageStats(),
    ]);

    return NextResponse.json({
      items: result.items.map(serializeContactMessage),
      total: result.total,
      page,
      pageSize,
      stats,
    });
  } catch (error) {
    console.error("[GET /api/admin/contact-messages]", error);
    const message = error instanceof Error ? error.message : "Failed to load messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
