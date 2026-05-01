import {
  getVendorsAdminDirectoryPage,
  getVendorsAdminDirectoryStats,
  type VendorsDirectoryFilter,
} from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const FILTERS: VendorsDirectoryFilter[] = ["all", "vendor_only", "provider_only", "needs_verification"];

function isAdminUser(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false;
  const appRole = String(user.app_metadata?.role ?? "").toLowerCase();
  const appRoles = Array.isArray(user.app_metadata?.roles)
    ? (user.app_metadata.roles as unknown[]).map((r) => String(r).toLowerCase())
    : [];
  return appRole === "admin" || appRoles.includes("admin");
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSizeRaw = parseInt(searchParams.get("pageSize") || "25", 10) || 25;
    const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
    const q = String(searchParams.get("q") ?? "").trim();
    const filterRaw = String(searchParams.get("filter") ?? "all").trim() as VendorsDirectoryFilter;
    const filter = FILTERS.includes(filterRaw) ? filterRaw : "all";

    const offset = (page - 1) * pageSize;

    const [pageResult, stats] = await Promise.all([
      getVendorsAdminDirectoryPage({
        search: q,
        filter,
        limit: pageSize,
        offset,
      }),
      getVendorsAdminDirectoryStats(),
    ]);

    return NextResponse.json({
      items: pageResult.vendors,
      total: pageResult.total,
      page,
      pageSize,
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/admin/vendors]", message);
    return NextResponse.json({ error: "Failed to load vendors" }, { status: 500 });
  }
}
