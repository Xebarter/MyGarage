import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
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
    });

    if (insertError) {
      // If the email is already used by another vendor row, surface a clear message.
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to bootstrap vendor" }, { status: 500 });
  }
}

