import { createVendor, getVendors } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const vendors = await getVendors();
    return NextResponse.json(vendors);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const appRole = String(user?.app_metadata?.role ?? "").toLowerCase();
    const appRoles = Array.isArray(user?.app_metadata?.roles)
      ? (user?.app_metadata?.roles as unknown[]).map((r) => String(r).toLowerCase())
      : [];
    const isAdminUser = appRole === "admin" || appRoles.includes("admin");

    if (!isAdminUser) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const rating = typeof body.rating === "number" ? body.rating : Number(body.rating);

    if (!name || !email) {
      return NextResponse.json({ error: "name and email are required" }, { status: 400 });
    }

    const created = await createVendor({
      name,
      email,
      phone,
      address,
      rating: Number.isFinite(rating) ? rating : 0,
      totalProducts: 0,
      serviceOfferings: [],
      vendorVerified: false,
      servicesVerified: false,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
