import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

const PORTALS = new Set(["buyer", "vendor", "services", "admin"]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: unknown; portal?: unknown };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const portalRaw = typeof body.portal === "string" ? body.portal.trim().toLowerCase() : "buyer";
    const portal = PORTALS.has(portalRaw) ? portalRaw : "buyer";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("auth_portal_signup_blocked", {
      check_email: email,
      portal,
    });

    if (error) {
      console.error("[check-email-registered]", error.message);
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }

    return NextResponse.json({ registered: Boolean(data) });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
