import { NextRequest, NextResponse } from "next/server";

import { getAllBuyerServiceRequests, getCustomers, getOrders } from "@/lib/db";

type ClientSegment = "product" | "service" | "mixed" | "inactive";

type ClientSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;

  totalOrders: number;
  totalSpent: number;

  serviceRequestsTotal: number;
  serviceRequestsOpen: number;
  lastServiceRequestAt: string | null;

  segment: ClientSegment;
  lastActivityAt: string | null;
};

function toIso(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeQuery(value: string | null): string {
  return String(value ?? "").trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = normalizeQuery(searchParams.get("q"));
    const segmentFilter = normalizeQuery(searchParams.get("segment")) as
      | ClientSegment
      | "all"
      | "";
    const sort = normalizeQuery(searchParams.get("sort")) as
      | "recent"
      | "spent"
      | "orders"
      | "service"
      | "";

    const [customers, serviceRequests, orders] = await Promise.all([
      getCustomers(),
      getAllBuyerServiceRequests(),
      getOrders(),
    ]);

    const serviceByCustomer = new Map<
      string,
      { total: number; open: number; lastAt: string | null }
    >();
    for (const req of serviceRequests) {
      const key = req.customerId;
      const existing = serviceByCustomer.get(key) ?? { total: 0, open: 0, lastAt: null };
      existing.total += 1;
      if (["pending", "matched", "in_progress"].includes(req.status)) existing.open += 1;
      const createdAt = toIso(req.createdAt);
      if (createdAt && (!existing.lastAt || createdAt > existing.lastAt)) existing.lastAt = createdAt;
      serviceByCustomer.set(key, existing);
    }

    const ordersByCustomer = new Map<string, { total: number; lastAt: string | null }>();
    for (const order of orders) {
      const key = order.customerId;
      const existing = ordersByCustomer.get(key) ?? { total: 0, lastAt: null };
      existing.total += 1;
      const createdAt = toIso(order.createdAt);
      if (createdAt && (!existing.lastAt || createdAt > existing.lastAt)) existing.lastAt = createdAt;
      ordersByCustomer.set(key, existing);
    }

    const rows: ClientSummary[] = customers.map((c) => {
      const service = serviceByCustomer.get(c.id) ?? { total: 0, open: 0, lastAt: null };
      const orderAgg = ordersByCustomer.get(c.id) ?? { total: c.totalOrders ?? 0, lastAt: null };
      const productOrders = Number(c.totalOrders ?? orderAgg.total ?? 0);
      const productSpent = Number(c.totalSpent ?? 0);
      const hasProduct = productOrders > 0 || productSpent > 0;
      const hasService = service.total > 0;
      const segment: ClientSegment = hasProduct && hasService ? "mixed" : hasProduct ? "product" : hasService ? "service" : "inactive";

      const createdAt = toIso(c.createdAt) ?? new Date().toISOString();
      const lastActivityAt =
        [service.lastAt, orderAgg.lastAt, createdAt].filter(Boolean).sort().at(-1) ?? null;

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        createdAt,
        totalOrders: productOrders,
        totalSpent: productSpent,
        serviceRequestsTotal: service.total,
        serviceRequestsOpen: service.open,
        lastServiceRequestAt: service.lastAt,
        segment,
        lastActivityAt,
      };
    });

    const filtered = rows.filter((row) => {
      const matchesSegment =
        !segmentFilter ||
        segmentFilter === "all" ||
        row.segment === segmentFilter;
      if (!matchesSegment) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q) ||
        row.address.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sort === "spent") return b.totalSpent - a.totalSpent;
      if (sort === "orders") return b.totalOrders - a.totalOrders;
      if (sort === "service") return b.serviceRequestsTotal - a.serviceRequestsTotal;
      const aKey = a.lastActivityAt ?? a.createdAt;
      const bKey = b.lastActivityAt ?? b.createdAt;
      return bKey.localeCompare(aKey);
    });

    return NextResponse.json({ clients: sorted });
  } catch (error) {
    console.error("admin clients GET failed", error);
    return NextResponse.json({ error: "Failed to load clients" }, { status: 500 });
  }
}

