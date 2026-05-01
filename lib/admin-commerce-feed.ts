import type { Order } from "@/lib/db";
import { getOrders } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BuyerServiceRequest } from "@/lib/supabase/buyer-services-repo";
import * as buyerServicesRepo from "@/lib/supabase/buyer-services-repo";

export type CommercePipelineStage = "pending" | "in_flight" | "completed" | "cancelled";

export type ServicePaymentSummary = {
  id: string;
  requestId: string;
  amountUgx: number;
  status: string;
  createdAt: string;
  providerId: string | null;
};

export type AdminUnifiedCommerceItem = {
  kind: "product" | "service";
  id: string;
  sortAt: string;
  updatedAt: string;
  summary: string;
  subtitle: string;
  customerName: string;
  customerEmail: string;
  amountUgx: number | null;
  statusKey: string;
  pipeline: CommercePipelineStage;
  productOrder?: Order;
  service?: {
    request: BuyerServiceRequest;
    payments: ServicePaymentSummary[];
  };
};

function toIso(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function productPipeline(status: Order["status"]): CommercePipelineStage {
  if (status === "pending") return "pending";
  if (status === "processing" || status === "shipped") return "in_flight";
  if (status === "delivered") return "completed";
  return "cancelled";
}

function servicePipeline(status: BuyerServiceRequest["status"]): CommercePipelineStage {
  if (status === "pending") return "pending";
  if (status === "matched" || status === "in_progress") return "in_flight";
  if (status === "completed") return "completed";
  return "cancelled";
}

type ServicePaymentRow = {
  id: string;
  request_id: string;
  amount: number | string;
  status: string;
  created_at: string;
  provider_id: string | null;
};

export async function getAdminCommerceFeed(): Promise<{
  items: AdminUnifiedCommerceItem[];
  notes: string[];
}> {
  const notes: string[] = [];
  const items: AdminUnifiedCommerceItem[] = [];

  let productOrders: Order[] = [];
  try {
    productOrders = await getOrders();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    notes.push(`Product orders could not be loaded: ${msg}`);
  }

  let serviceRequests: BuyerServiceRequest[] = [];
  try {
    serviceRequests = await buyerServicesRepo.listAllBuyerServiceRequests();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    notes.push(`Service bookings could not be loaded: ${msg}`);
  }

  const paymentsByRequest = new Map<string, ServicePaymentSummary[]>();
  if (serviceRequests.length > 0) {
    try {
      const supabase = createAdminClient();
      const ids = serviceRequests.map((r) => r.id);
      const { data, error } = await supabase
        .from("service_payments")
        .select("id,request_id,amount,status,created_at,provider_id")
        .in("request_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      for (const row of (data ?? []) as ServicePaymentRow[]) {
        const summary: ServicePaymentSummary = {
          id: row.id,
          requestId: row.request_id,
          amountUgx: Math.round(Number(row.amount)),
          status: row.status,
          createdAt: row.created_at,
          providerId: row.provider_id,
        };
        const list = paymentsByRequest.get(row.request_id) ?? [];
        list.push(summary);
        paymentsByRequest.set(row.request_id, list);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      notes.push(`Service payments could not be loaded: ${msg}`);
    }
  }

  const customerById = new Map<string, { name: string; email: string }>();
  if (serviceRequests.length > 0) {
    try {
      const supabase = createAdminClient();
      const cids = [...new Set(serviceRequests.map((r) => r.customerId))];
      const { data, error } = await supabase.from("customers").select("id,name,email").in("id", cids);
      if (error) throw new Error(error.message);
      for (const c of data ?? []) {
        customerById.set(c.id as string, {
          name: String((c as { name?: string }).name ?? ""),
          email: String((c as { email?: string }).email ?? ""),
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      notes.push(`Customer directory (for services): ${msg}`);
    }
  }

  for (const o of productOrders) {
    const names = o.items.map((i) => i.productName).filter(Boolean);
    const subtitle =
      names.length === 0
        ? "No line items"
        : names.length <= 2
          ? names.join(" · ")
          : `${names.slice(0, 2).join(" · ")} +${names.length - 2}`;
    items.push({
      kind: "product",
      id: o.id,
      sortAt: toIso(o.createdAt),
      updatedAt: toIso(o.updatedAt),
      summary: `${o.items.length} line item${o.items.length === 1 ? "" : "s"} · product order`,
      subtitle,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      amountUgx: o.total,
      statusKey: o.status,
      pipeline: productPipeline(o.status),
      productOrder: o,
    });
  }

  for (const r of serviceRequests) {
    const cust = customerById.get(r.customerId);
    const payments = paymentsByRequest.get(r.id) ?? [];
    const paidTotal = payments.reduce((s, p) => s + p.amountUgx, 0);
    const amountUgx = paidTotal > 0 ? paidTotal : null;
    items.push({
      kind: "service",
      id: r.id,
      sortAt: toIso(r.createdAt),
      updatedAt: toIso(r.updatedAt),
      summary: r.service,
      subtitle: `${r.category} · ${r.location}`,
      customerName: cust?.name?.trim() || r.buyerContactName || "Customer",
      customerEmail: cust?.email?.trim() || "—",
      amountUgx,
      statusKey: r.status,
      pipeline: servicePipeline(r.status),
      service: { request: r, payments },
    });
  }

  items.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());

  return { items, notes };
}
