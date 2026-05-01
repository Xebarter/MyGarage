import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createPayout, executePayout, getPaytotaConfig } from "@/lib/paytota";

type CustomerRow = { id: string; name: string; email: string; phone: string | null };
type VendorRow = { id: string; name: string; email: string; phone: string | null };
type CheckoutSessionRow = {
  id: string;
  customer_id: string;
  checkout_type: string;
  status: string;
  total_amount: number | string | null;
};
type LineRow = {
  id: string;
  checkout_id: string;
  line_type: string;
  product_id: string | null;
  service_request_id: string | null;
  vendor_id: string | null;
  title: string;
  quantity: number;
  unit_amount: number | string;
  line_total_amount: number | string;
};
type ProductRow = { id: string; name: string; sku: string | null; vendor_id: string };
type ServicePaymentRow = {
  id: string;
  request_id: string;
  customer_id: string;
  provider_id: string | null;
  amount: number | string;
  status: string;
};
type BuyerRequestRow = {
  id: string;
  category: string;
  service: string;
  location: string;
  customer_id: string;
};

type PaytotaTxRow = {
  id: string;
  created_at: string;
  status: string;
  amount: number | string | null;
  provider_reference: string | null;
  checkout_id: string | null;
  service_payment_id: string | null;
  customer_id: string | null;
  vendor_id: string | null;
};

function isAdminUser(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false;
  const appRole = String(user.app_metadata?.role ?? "").toLowerCase();
  const appRoles = Array.isArray(user.app_metadata?.roles)
    ? (user.app_metadata.roles as unknown[]).map((r) => String(r).toLowerCase())
    : [];
  return appRole === "admin" || appRoles.includes("admin");
}

function num(n: unknown) {
  return Number(n ?? 0);
}

function toMapById<T extends { id: string }>(rows: T[]): Record<string, T> {
  const m: Record<string, T> = {};
  for (const r of rows) m[r.id] = r;
  return m;
}

type DisbursementQueueRow = Record<string, unknown>;

function maskAccountNumber(raw: string | null | undefined): string {
  const s = String(raw ?? "").replace(/\s+/g, "");
  if (s.length <= 4) return s || "—";
  return `···${s.slice(-4)}`;
}

export async function GET() {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const [paymentsRes, disbursementsRes] = await Promise.all([
      supabase
        .from("paytota_transactions")
        .select("id,created_at,status,currency,amount,provider_reference,direction,transaction_type,checkout_id,service_payment_id,vendor_id,customer_id")
        .eq("transaction_type", "collection")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("admin_disbursement_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
    ]);
    if (paymentsRes.error) throw new Error(paymentsRes.error.message);
    if (disbursementsRes.error) throw new Error(disbursementsRes.error.message);

    const txRows = (paymentsRes.data ?? []) as PaytotaTxRow[];
    const checkoutIds = [...new Set(txRows.map((r) => r.checkout_id).filter(Boolean))] as string[];
    const servicePaymentIds = [...new Set(txRows.map((r) => r.service_payment_id).filter(Boolean))] as string[];

    const customerIdSet = new Set<string>();
    const vendorIdSet = new Set<string>();
    for (const r of txRows) {
      if (r.customer_id) customerIdSet.add(r.customer_id);
      if (r.vendor_id) vendorIdSet.add(r.vendor_id);
    }

    const checkoutSessions: Record<string, CheckoutSessionRow> = {};
    const lineItemsByCheckout: Record<string, LineRow[]> = {};

    if (checkoutIds.length > 0) {
      const { data: sessions, error: sessErr } = await supabase
        .from("checkout_sessions")
        .select("id,customer_id,checkout_type,status,total_amount")
        .in("id", checkoutIds);
      if (sessErr) throw new Error(sessErr.message);
      for (const s of sessions ?? []) {
        checkoutSessions[s.id] = s as CheckoutSessionRow;
        if (s.customer_id) customerIdSet.add(s.customer_id);
      }

      const { data: lines, error: linesErr } = await supabase
        .from("checkout_line_items")
        .select(
          "id,checkout_id,line_type,product_id,service_request_id,vendor_id,title,quantity,unit_amount,line_total_amount",
        )
        .in("checkout_id", checkoutIds);
      if (linesErr) throw new Error(linesErr.message);
      for (const line of (lines ?? []) as LineRow[]) {
        if (!lineItemsByCheckout[line.checkout_id]) lineItemsByCheckout[line.checkout_id] = [];
        lineItemsByCheckout[line.checkout_id].push(line);
        if (line.vendor_id) vendorIdSet.add(line.vendor_id);
      }
    }

    const serviceRequestIdsFromLines = new Set<string>();
    for (const lines of Object.values(lineItemsByCheckout)) {
      for (const l of lines) {
        if (l.service_request_id) serviceRequestIdsFromLines.add(l.service_request_id);
      }
    }

    const productIds = new Set<string>();
    for (const lines of Object.values(lineItemsByCheckout)) {
      for (const l of lines) {
        if (l.product_id) productIds.add(l.product_id);
      }
    }

    const productMap: Record<string, ProductRow> = {};
    if (productIds.size > 0) {
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id,name,sku,vendor_id")
        .in("id", [...productIds]);
      if (pErr) throw new Error(pErr.message);
      for (const p of (products ?? []) as ProductRow[]) {
        productMap[p.id] = p;
        if (p.vendor_id) vendorIdSet.add(p.vendor_id);
      }
    }

    const servicePayments: Record<string, ServicePaymentRow> = {};
    const servicePaymentRequestIds = new Set<string>();
    if (servicePaymentIds.length > 0) {
      const { data: spRows, error: spErr } = await supabase
        .from("service_payments")
        .select("id,request_id,customer_id,provider_id,amount,status")
        .in("id", servicePaymentIds);
      if (spErr) throw new Error(spErr.message);
      for (const sp of (spRows ?? []) as ServicePaymentRow[]) {
        servicePayments[sp.id] = sp;
        customerIdSet.add(sp.customer_id);
        if (sp.provider_id) vendorIdSet.add(sp.provider_id);
        servicePaymentRequestIds.add(sp.request_id);
      }
    }

    const buyerRequestMap: Record<string, BuyerRequestRow> = {};
    const allBuyerRequestIds = [...new Set([...serviceRequestIdsFromLines, ...servicePaymentRequestIds])];
    if (allBuyerRequestIds.length > 0) {
      const { data: reqs, error: reqErr } = await supabase
        .from("buyer_service_requests")
        .select("id,category,service,location,customer_id")
        .in("id", allBuyerRequestIds);
      if (reqErr) throw new Error(reqErr.message);
      for (const r of (reqs ?? []) as BuyerRequestRow[]) {
        buyerRequestMap[r.id] = r;
        customerIdSet.add(r.customer_id);
      }
    }

    const customerMap: Record<string, CustomerRow> = {};
    if (customerIdSet.size > 0) {
      const { data: custRows, error: cErr } = await supabase
        .from("customers")
        .select("id,name,email,phone")
        .in("id", [...customerIdSet]);
      if (cErr) throw new Error(cErr.message);
      Object.assign(customerMap, toMapById((custRows ?? []) as CustomerRow[]));
    }

    const vendorMap: Record<string, VendorRow> = {};
    if (vendorIdSet.size > 0) {
      const { data: vRows, error: vErr } = await supabase
        .from("vendors")
        .select("id,name,email,phone")
        .in("id", [...vendorIdSet]);
      if (vErr) throw new Error(vErr.message);
      Object.assign(vendorMap, toMapById((vRows ?? []) as VendorRow[]));
    }

    const payments = txRows.map((row) => {
      const buyerFromCustomer = (cid: string | null | undefined) => {
        if (!cid) return null;
        const c = customerMap[cid];
        if (!c) {
          return {
            id: cid,
            name: "Unknown buyer",
            email: "",
            phone: "",
          };
        }
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone ?? "",
        };
      };

      const flow: "product_checkout" | "service_payment" = row.service_payment_id
        ? "service_payment"
        : "product_checkout";

      let buyer = buyerFromCustomer(row.customer_id);
      let checkout:
        | {
            id: string;
            sessionType: string;
            sessionStatus: string;
            sessionTotalUgx: number;
          }
        | null = null;
      let lineItems: Array<{
        id: string;
        lineType: "product" | "service";
        title: string;
        quantity: number;
        unitAmountUgx: number;
        lineTotalUgx: number;
        productId: string | null;
        productName: string | null;
        sku: string | null;
        vendorId: string | null;
        vendorName: string;
        vendorEmail: string | null;
        vendorPhone: string | null;
        serviceRequestId: string | null;
        serviceRequest: {
          id: string;
          category: string;
          service: string;
          location: string;
        } | null;
      }> = [];
      let service: {
        servicePaymentId: string;
        requestId: string;
        category: string;
        serviceName: string;
        location: string;
        providerId: string | null;
        providerName: string;
        providerEmail: string | null;
        providerPhone: string | null;
        paymentStatus: string;
      } | null = null;

      if (row.checkout_id) {
        const sess = checkoutSessions[row.checkout_id];
        if (sess) {
          checkout = {
            id: row.checkout_id,
            sessionType: sess.checkout_type,
            sessionStatus: sess.status,
            sessionTotalUgx: num(sess.total_amount),
          };
          buyer = buyerFromCustomer(sess.customer_id) ?? buyer;
        } else {
          checkout = {
            id: row.checkout_id,
            sessionType: "unavailable",
            sessionStatus: "unavailable",
            sessionTotalUgx: 0,
          };
        }
        const lines = lineItemsByCheckout[row.checkout_id] ?? [];
        lineItems = lines.map((l) => {
          const v = l.vendor_id ? vendorMap[l.vendor_id] : undefined;
          const prod = l.product_id ? productMap[l.product_id] : undefined;
          const sr = l.service_request_id ? buyerRequestMap[l.service_request_id] : undefined;
          return {
            id: l.id,
            lineType: l.line_type === "service" ? ("service" as const) : ("product" as const),
            title: l.title,
            quantity: l.quantity,
            unitAmountUgx: num(l.unit_amount),
            lineTotalUgx: num(l.line_total_amount),
            productId: l.product_id,
            productName: prod?.name ?? null,
            sku: prod?.sku ?? null,
            vendorId: l.vendor_id,
            vendorName: v?.name ?? (l.vendor_id ? "Unknown vendor" : "—"),
            vendorEmail: v?.email ?? null,
            vendorPhone: v?.phone ?? null,
            serviceRequestId: l.service_request_id,
            serviceRequest: sr
              ? {
                  id: sr.id,
                  category: sr.category,
                  service: sr.service,
                  location: sr.location,
                }
              : null,
          };
        });
      }

      if (row.service_payment_id && servicePayments[row.service_payment_id]) {
        const sp = servicePayments[row.service_payment_id];
        const req = buyerRequestMap[sp.request_id];
        const prov = sp.provider_id ? vendorMap[sp.provider_id] : undefined;
        buyer = buyerFromCustomer(sp.customer_id) ?? buyer;
        service = {
          servicePaymentId: sp.id,
          requestId: sp.request_id,
          category: req?.category ?? "",
          serviceName: req?.service ?? "",
          location: req?.location ?? "",
          providerId: sp.provider_id,
          providerName: prov?.name ?? (sp.provider_id ? "Unknown provider" : "No provider linked"),
          providerEmail: prov?.email ?? null,
          providerPhone: prov?.phone ?? null,
          paymentStatus: sp.status,
        };
      }

      const vendorNamesUnique = [...new Set(lineItems.map((l) => l.vendorName).filter((n) => n && n !== "—"))];
      const counterpartySummary =
        service != null
          ? service.providerName
          : vendorNamesUnique.length > 0
            ? vendorNamesUnique.join(", ")
            : row.vendor_id
              ? vendorMap[row.vendor_id]?.name ?? row.vendor_id
              : "—";

      const searchBlobParts: string[] = [
        row.id,
        row.provider_reference ?? "",
        buyer?.name ?? "",
        buyer?.email ?? "",
        buyer?.phone ?? "",
        buyer?.id ?? "",
        counterpartySummary,
      ];
      for (const li of lineItems) {
        searchBlobParts.push(
          li.title,
          li.productName ?? "",
          li.sku ?? "",
          li.vendorName,
          li.vendorEmail ?? "",
          li.serviceRequest?.service ?? "",
          li.serviceRequest?.category ?? "",
          li.serviceRequest?.location ?? "",
        );
      }
      if (service) {
        searchBlobParts.push(
          service.serviceName,
          service.category,
          service.location,
          service.providerName,
          service.providerEmail ?? "",
        );
      }
      if (checkout) {
        searchBlobParts.push(checkout.id, checkout.sessionType, checkout.sessionStatus);
      }

      const customerName = buyer?.name ?? row.customer_id ?? "Unknown buyer";
      const vendorName = counterpartySummary;

      return {
        id: row.id,
        flow,
        checkoutType: flow === "service_payment" ? ("service" as const) : ("product" as const),
        customerName,
        vendorName,
        buyer,
        checkout,
        lineItems,
        service,
        amount: num(row.amount),
        currency: "UGX" as const,
        provider: "paytota" as const,
        providerReference: row.provider_reference ?? "",
        status: row.status,
        createdAt: row.created_at,
        searchBlob: searchBlobParts.filter(Boolean).join(" ").toLowerCase(),
      };
    });

    const queueRows = (disbursementsRes.data ?? []) as DisbursementQueueRow[];
    const disbursementIds = queueRows.map((r) => String(r.id ?? "")).filter(Boolean);

    const paytotaByDisbursement: Record<
      string,
      { status: string; providerStatus: string | null; providerReference: string | null; updatedAt: string }
    > = {};

    if (disbursementIds.length > 0) {
      const { data: outboundRows, error: obErr } = await supabase
        .from("paytota_transactions")
        .select("admin_disbursement_id,status,provider_status,provider_reference,created_at,updated_at")
        .eq("transaction_type", "disbursement")
        .in("admin_disbursement_id", disbursementIds)
        .order("created_at", { ascending: false });
      if (obErr) throw new Error(obErr.message);
      for (const r of outboundRows ?? []) {
        const aid = r.admin_disbursement_id as string | null;
        if (!aid || paytotaByDisbursement[aid]) continue;
        paytotaByDisbursement[aid] = {
          status: String(r.status ?? ""),
          providerStatus: r.provider_status != null ? String(r.provider_status) : null,
          providerReference: r.provider_reference != null ? String(r.provider_reference) : null,
          updatedAt: String(r.updated_at ?? r.created_at ?? ""),
        };
      }
    }

    const disbursements = queueRows.map((row) => {
      const id = String(row.id ?? "");
      const pt = paytotaByDisbursement[id];
      const acctType = row.payout_account_type != null ? String(row.payout_account_type) : null;
      const acctNum = row.payout_account_number != null ? String(row.payout_account_number) : "";
      return {
        id,
        vendorId: String(row.vendor_id ?? ""),
        vendorName: String(row.vendor_name ?? "Vendor"),
        vendorEmail: row.vendor_email != null ? String(row.vendor_email) : null,
        sourceType: row.source_type as "product_checkout" | "service_payment" | "manual_adjustment",
        sourceReference: String(row.source_reference ?? ""),
        grossAmount: Number(row.gross_amount ?? 0),
        feeAmount: Number(row.fee_amount ?? 0),
        netAmount: Number(row.net_amount ?? 0),
        currency: "UGX",
        status: row.status as
          | "pending_approval"
          | "approved"
          | "processing"
          | "paid"
          | "failed"
          | "rejected"
          | "reversed",
        payoutReference: row.payout_reference != null ? String(row.payout_reference) : undefined,
        scheduledFor: row.scheduled_for != null ? String(row.scheduled_for) : undefined,
        paidOutAt: row.paid_out_at != null ? String(row.paid_out_at) : undefined,
        failedAt: row.failed_at != null ? String(row.failed_at) : undefined,
        rejectedReason: row.rejected_reason != null ? String(row.rejected_reason) : undefined,
        createdAt: String(row.created_at ?? ""),
        updatedAt: String(row.updated_at ?? row.created_at ?? ""),
        payoutAccountConfigured: Boolean(row.payout_account_id),
        payoutAccount: acctType
          ? {
              type: acctType,
              network: row.payout_network != null ? String(row.payout_network) : null,
              accountName: row.payout_account_name != null ? String(row.payout_account_name) : null,
              accountNumberMasked: maskAccountNumber(acctNum),
            }
          : null,
        paytotaPayout: pt
          ? {
              status: pt.status,
              providerStatus: pt.providerStatus,
              providerReference: pt.providerReference,
              lastEventAt: pt.updatedAt,
            }
          : null,
      };
    });

    return NextResponse.json({ payments, disbursements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load payment operations data";
    console.error("[GET /api/admin/payments]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const body = await req.json();
    const { disbursementId, status, payoutReference, scheduledFor, rejectedReason } = body ?? {};

    if (!disbursementId) {
      return NextResponse.json(
        { error: "disbursementId is required" },
        { status: 400 },
      );
    }

    if (scheduledFor) {
      const parsed = new Date(scheduledFor);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "scheduledFor must be a valid date" },
          { status: 400 },
        );
      }
      const { data, error } = await supabase
        .from("admin_disbursements")
        .update({ scheduled_for: parsed.toISOString() })
        .eq("id", disbursementId)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return NextResponse.json({ error: "Disbursement not found" }, { status: 404 });
      return NextResponse.json(data);
    }

    if (!status) {
      return NextResponse.json(
        { error: "status is required when not scheduling" },
        { status: 400 },
      );
    }

    const { data: disbursement, error: disbursementError } = await supabase
      .from("admin_disbursements")
      .select("id,vendor_id,payout_account_id,net_amount,currency,status")
      .eq("id", disbursementId)
      .maybeSingle();
    if (disbursementError) throw new Error(disbursementError.message);
    if (!disbursement) return NextResponse.json({ error: "Disbursement not found" }, { status: 404 });

    if (status === "processing") {
      if (!disbursement.payout_account_id) {
        return NextResponse.json({ error: "No payout account configured for disbursement" }, { status: 400 });
      }
      const { data: payoutAccount, error: payoutAccountError } = await supabase
        .from("vendor_payout_accounts")
        .select("account_type,account_name,account_number,network,metadata")
        .eq("id", disbursement.payout_account_id)
        .maybeSingle();
      if (payoutAccountError) throw new Error(payoutAccountError.message);
      if (!payoutAccount) {
        return NextResponse.json({ error: "Payout account not found" }, { status: 404 });
      }

      const { data: vendorRow } = await supabase
        .from("vendors")
        .select("email,name")
        .eq("id", disbursement.vendor_id)
        .maybeSingle();

      const vendorEmail = String(vendorRow?.email ?? "").trim();
      const clientEmail =
        vendorEmail.length > 0 && vendorEmail.includes("@")
          ? vendorEmail
          : `vendor-${disbursement.vendor_id}@mygarage.local`;

      const { brandId } = getPaytotaConfig();

      const payload = {
        client: {
          email: clientEmail,
          phone: payoutAccount.account_number,
          country: "UG",
          full_name: payoutAccount.account_name,
          bank_account:
            payoutAccount.account_type === "bank_account" ? payoutAccount.account_number : undefined,
        },
        payment: {
          currency: disbursement.currency,
          amount: Number(disbursement.net_amount),
          description: `MyGarage vendor disbursement ${disbursement.id}`,
        },
        reference: disbursement.id,
        brand_id: brandId,
      };

      const payout = await createPayout(payload);
      const executionUrl = String(payout.execution_url ?? "");
      if (!executionUrl) throw new Error("Missing execution_url from Paytota payout response");

      const executePayload =
        payoutAccount.account_type === "bank_account"
          ? {
              payout_type: "bank",
              bank_name: payoutAccount.network ?? "",
              bank_code: String((payoutAccount.metadata as Record<string, unknown> | null)?.bank_code ?? ""),
              bank_account_name: payoutAccount.account_name,
              bank_account_number: payoutAccount.account_number,
            }
          : {
              payout_type: "mobile",
            };

      const executeResponse = await executePayout(executionUrl, executePayload);

      const providerReference = String(payout.id ?? disbursement.id);
      await supabase.rpc("admin_set_disbursement_status", {
        p_disbursement_id: disbursement.id,
        p_status: "processing",
        p_actor_id: user.id ?? "admin-api",
        p_rejected_reason: null,
        p_payout_reference: providerReference,
      });

      const { error: txError } = await supabase.from("paytota_transactions").insert({
        id: `ptx-${randomUUID()}`,
        transaction_type: "disbursement",
        direction: "outbound",
        admin_disbursement_id: disbursement.id,
        vendor_id: disbursement.vendor_id,
        currency: disbursement.currency,
        amount: Number(disbursement.net_amount),
        provider_reference: providerReference,
        provider_status: String(executeResponse.status ?? "pending"),
        status: "processing",
        request_payload: { payout, executePayload },
        response_payload: executeResponse,
        webhook_payload: {},
      });
      if (txError) throw new Error(txError.message);

      return NextResponse.json({
        id: disbursement.id,
        status: "processing",
        payoutReference: providerReference,
      });
    }

    const { error: statusError } = await supabase.rpc("admin_set_disbursement_status", {
      p_disbursement_id: disbursement.id,
      p_status: status,
      p_actor_id: user.id ?? "admin-api",
      p_rejected_reason: rejectedReason ?? null,
      p_payout_reference: payoutReference ?? null,
    });
    if (statusError) throw new Error(statusError.message);

    const { data: updated, error: fetchError } = await supabase
      .from("admin_disbursements")
      .select("*")
      .eq("id", disbursement.id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update disbursement";
    console.error("[PATCH /api/admin/payments]", error);
    const isPaytota = message.includes("Paytota");
    return NextResponse.json(
      { error: message },
      { status: isPaytota ? 502 : 500 },
    );
  }
}
