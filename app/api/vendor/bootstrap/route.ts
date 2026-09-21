import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { getAuthGivenName } from "@/lib/auth-avatar";
import { isPlaceholderEmail, normalizeToE164, placeholderEmailForPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVendorByPhone } from "@/lib/supabase/vendors-repo";

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

    const admin = createAdminClient();

    const { data: existing, error: lookupError } = await admin
      .from("vendors")
      .select("id, phone")
      .eq("id", user.id)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({ error: "Failed to lookup vendor" }, { status: 500 });
    }

    const metaPhone = String(user.user_metadata?.phone ?? "").trim();
    const phone =
      normalizeToE164(user.phone ?? "") ??
      normalizeToE164(metaPhone) ??
      (user.phone ?? metaPhone).trim();
    const emailFromAuth = (user.email ?? "").trim();
    const email =
      emailFromAuth && !isPlaceholderEmail(emailFromAuth)
        ? emailFromAuth
        : phone
          ? placeholderEmailForPhone(phone)
          : emailFromAuth;

    if (!email && !phone) {
      return NextResponse.json({ error: "Missing phone or email" }, { status: 400 });
    }

    if (existing?.id) {
      const existingDigits = String(existing.phone ?? "").replace(/\D/g, "");
      if (phone && existingDigits.length < 9) {
        await admin.from("vendors").update({ phone }).eq("id", user.id);
      }
      return NextResponse.json({ ok: true });
    }

    if (phone) {
      try {
        const byPhone = await getVendorByPhone(phone);
        if (byPhone?.id) {
          return NextResponse.json({ ok: true });
        }
      } catch {
        // Lookup is best-effort; insert below still enforces unique ids.
      }
    }

    const given = getAuthGivenName(user).trim();
    const fallbackName =
      given ||
      (phone ? phone.replace(/^\+256/, "0") : "") ||
      (email ? email.split("@")[0] : "") ||
      "Vendor";

    const { error: insertError } = await admin.from("vendors").insert({
      id: user.id,
      name: fallbackName,
      email: email || placeholderEmailForPhone(phone),
      phone: phone || "",
      address: "",
      rating: 0,
      total_products: 0,
      vendor_verified: false,
      services_verified: false,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    const { notifyLoggedInAdminsBestEffort } = await import("@/lib/push/notify-admins");
    void notifyLoggedInAdminsBestEffort({
      kind: "portal_access",
      title: "Portal access requested",
      body: `${fallbackName} needs supplier or service-provider approval.`,
      url: "/admin/vendors",
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to bootstrap vendor" }, { status: 500 });
  }
}
