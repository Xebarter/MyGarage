import { createCustomer, getBuyerProfile, getCustomerByEmail } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId")?.trim() || "";
    const email = searchParams.get("email")?.trim() || "";

    let resolvedId = customerId;
    if (!resolvedId && email) {
      const customer = await getCustomerByEmail(email);
      resolvedId = customer?.id ?? "";
    }

    if (!resolvedId) {
      return NextResponse.json({ error: "customerId or email is required" }, { status: 400 });
    }

    const profile = await getBuyerProfile(resolvedId);
    if (!profile) {
      return NextResponse.json({ error: "Buyer profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch buyer profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    const address = String(body?.address ?? "").trim();

    if (!name || !email) {
      return NextResponse.json({ error: "name and email are required" }, { status: 400 });
    }

    const existing = await getCustomerByEmail(email);
    if (existing) {
      const profile = await getBuyerProfile(existing.id);
      return NextResponse.json(profile ?? { customer: existing }, { status: 200 });
    }

    const created = await createCustomer({
      name,
      email,
      phone,
      address,
      totalOrders: 0,
      totalSpent: 0,
    });

    const profile = await getBuyerProfile(created.id);
    return NextResponse.json(profile ?? { customer: created }, { status: 201 });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to create buyer profile" }, { status: 500 });
  }
}

