import { getComprehensiveAdminAnalytics } from "@/lib/admin-comprehensive-analytics";
import { NextRequest, NextResponse } from "next/server";

const MS_DAY = 86400000;

function analyticsErrorHint(message: string): string | undefined {
  if (message.includes("SUPABASE_SERVICE_ROLE_KEY") || message.includes("NEXT_PUBLIC_SUPABASE")) {
    return "Add Supabase URL, anon key, and service role key to .env (see SUPABASE.md).";
  }
  if (
    message.includes("fetch failed") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT") ||
    message.includes("EAI_AGAIN") ||
    message.includes("getaddrinfo") ||
    message.includes("certificate") ||
    message.includes("SSL")
  ) {
    return "The app server could not reach Supabase (network or DNS). Check NEXT_PUBLIC_SUPABASE_URL, VPN/firewall, TLS interception, and that the Supabase project is not paused.";
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const vendorId = searchParams.get("vendorId")?.trim() || undefined;
    const productCategory = searchParams.get("productCategory")?.trim() || undefined;
    const serviceCategory = searchParams.get("serviceCategory")?.trim() || undefined;

    const to = toParam ? new Date(toParam) : new Date();
    const from = fromParam ? new Date(fromParam) : new Date(to.getTime() - 30 * MS_DAY);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
    if (from.getTime() > to.getTime()) {
      return NextResponse.json({ error: "from must be before to" }, { status: 400 });
    }

    const data = await getComprehensiveAdminAnalytics({
      from,
      to,
      vendorId,
      productCategory,
      serviceCategory,
    });
    return NextResponse.json(data);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : "Failed to load analytics";
    console.error("[GET /api/admin/analytics]", e);
    return NextResponse.json(
      {
        error: message,
        hint: analyticsErrorHint(message),
      },
      { status: 500 },
    );
  }
}
