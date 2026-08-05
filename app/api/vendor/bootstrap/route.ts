import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    if (!user || !user.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const email = (user.email ?? "").trim();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: existing, error: lookupError } = await admin
      .from("vendors")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({ error: "Failed to lookup vendor" }, { status: 500 });
    }

    if (existing?.id) {
      return NextResponse.json({ ok: true });
    }

    const fallbackName = email.split("@")[0] || "Vendor";

    const { error: insertError } = await admin.from("vendors").insert({
      id: user.id,
      name: fallbackName,
      email,
      phone: "",
      address: "",
      rating: 0,
      total_products: 0,
      vendor_verified: false,
      services_verified: false,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to bootstrap vendor" }, { status: 500 });
  }
}
