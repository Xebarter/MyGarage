import { refreshHomeFeedsForAllCustomers } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization") || "";
  if (cronSecret && bearer === `Bearer ${cronSecret}`) return true;

  const configuredToken = process.env.FEED_REFRESH_TOKEN;
  if (configuredToken) {
    const providedToken = req.headers.get("x-feed-refresh-token") || "";
    if (providedToken === configuredToken) return true;
  }

  // In production, require at least one configured secret header.
  if (process.env.NODE_ENV === "production") return false;

  // In local/dev, allow requests when no secret is configured.
  return !cronSecret && !configuredToken;
}

function resolveLimitFromRequest(req: NextRequest, bodyLimit?: number): number {
  const fromQuery = Number(req.nextUrl.searchParams.get("limit") || "");
  const raw = Number.isFinite(fromQuery) && fromQuery > 0 ? fromQuery : Number(bodyLimit ?? 120);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 300) : 120;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = resolveLimitFromRequest(req, (body as { limit?: number })?.limit);

    await refreshHomeFeedsForAllCustomers(limit);
    return NextResponse.json({ ok: true, message: "All customer home feeds refreshed", limit });
  } catch (error) {
    return NextResponse.json({ error: "Failed to refresh home feeds" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = resolveLimitFromRequest(req);
    await refreshHomeFeedsForAllCustomers(limit);
    return NextResponse.json({ ok: true, message: "All customer home feeds refreshed", limit });
  } catch (error) {
    return NextResponse.json({ error: "Failed to refresh home feeds" }, { status: 500 });
  }
}
