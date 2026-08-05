import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { getVendor, updateVendor } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

/**
 * Authenticated self-service profile update for vendors/providers.
 * Prefer this over PUT /api/vendors/:id from mobile clients (avoids flaky PUT+308 redirects).
 *
 * Body (all optional partial): { name?, phone?, address?, imageUrl? }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const existing = await getVendor(user.id);
    if (!existing) {
      return NextResponse.json({ error: "Vendor profile not found. Complete signup first." }, { status: 404 });
    }

    const patch: {
      name?: string;
      phone?: string;
      address?: string;
      imageUrl?: string | null;
    } = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: "Display name is required" }, { status: 400 });
      }
      patch.name = name;
    }
    if (typeof body.phone === "string") {
      patch.phone = body.phone.trim();
    }
    if (typeof body.address === "string") {
      patch.address = body.address.trim();
    }
    if (body.imageUrl === null) {
      patch.imageUrl = null;
    } else if (typeof body.imageUrl === "string") {
      const url = body.imageUrl.trim();
      patch.imageUrl = url || null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(existing);
    }

    const vendor = await updateVendor(user.id, patch);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    return NextResponse.json(vendor);
  } catch (error) {
    console.error("[POST /api/vendor/profile]", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
