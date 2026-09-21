import { createCustomer, getBuyerProfile, getCustomer, getCustomerByEmail, getCustomerByPhone } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { normalizeToE164, placeholderEmailForPhone } from "@/lib/phone";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId")?.trim() || "";
    const email = searchParams.get("email")?.trim() || "";
    const phone = searchParams.get("phone")?.trim() || "";

    let resolvedId = customerId;
    if (!resolvedId && email) {
      const customer = await getCustomerByEmail(email);
      resolvedId = customer?.id ?? "";
    }
    if (!resolvedId && phone) {
      const customer = await getCustomerByPhone(phone);
      resolvedId = customer?.id ?? "";
    }

    if (!resolvedId) {
      return NextResponse.json({ error: "customerId, email, or phone is required" }, { status: 400 });
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
    const id = String(body?.id ?? "").trim();
    const phoneRaw = String(body?.phone ?? "").trim();
    const phone = normalizeToE164(phoneRaw) ?? phoneRaw;
    let email = String(body?.email ?? "").trim();
    let name = String(body?.name ?? "").trim();
    const address = String(body?.address ?? "").trim();

    if (!email && phone) {
      email = placeholderEmailForPhone(phone);
    }
    if (!name) {
      name = "Customer";
    }

    if (!email && !phone) {
      return NextResponse.json({ error: "phone or email is required" }, { status: 400 });
    }

    if (id) {
      const byId = await getCustomer(id);
      if (byId) {
        const profile = await getBuyerProfile(byId.id);
        return NextResponse.json(profile ?? { customer: byId }, { status: 200 });
      }
    }

    const existing =
      (email ? await getCustomerByEmail(email) : undefined) ??
      (phone ? await getCustomerByPhone(phone) : undefined);
    if (existing) {
      const profile = await getBuyerProfile(existing.id);
      return NextResponse.json(profile ?? { customer: existing }, { status: 200 });
    }

    const created = await createCustomer({
      id: id || undefined,
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

