import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomer, getCustomerByEmail } from "@/lib/db";
import {
  getPaytotaCancelRedirectUrl,
  getPaytotaFailureRedirectUrl,
  getPaytotaSuccessRedirectUrl,
} from "@/lib/app-url";
import { createPurchase, getPaytotaConfig } from "@/lib/paytota";

type CheckoutItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  vendorId?: string;
};

function normalizeUgPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("256")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `256${digits.slice(1)}`;
  if (digits.length === 9) return `256${digits}`;
  return digits;
}

function getPaytotaPaymentMethodWhitelist(): string[] | undefined {
  const raw = String(process.env.PAYTOTA_PAYMENT_METHOD_WHITELIST ?? "").trim();
  if (!raw) return ["airtel", "mtnmomo"];
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

function getPaytotaSkipCapture(): boolean {
  const raw = String(process.env.PAYTOTA_SKIP_CAPTURE ?? "").trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? (body.items as CheckoutItem[]) : [];
    const customerName = String(body?.customerName ?? "").trim();
    const customerEmail = String(body?.customerEmail ?? "").trim().toLowerCase();
    const customerPhone = normalizeUgPhone(String(body?.customerPhone ?? "").trim());
    const shippingAddress = String(body?.shippingAddress ?? "").trim();
    const successRedirect = typeof body?.successRedirect === "string" ? body.successRedirect : undefined;
    const failureRedirect = typeof body?.failureRedirect === "string" ? body.failureRedirect : undefined;

    if (items.length === 0) {
      return NextResponse.json({ error: "At least one checkout item is required" }, { status: 400 });
    }
    if (!customerEmail || !customerName) {
      return NextResponse.json({ error: "customerName and customerEmail are required" }, { status: 400 });
    }
    if (!customerPhone) {
      return NextResponse.json({ error: "customerPhone is required" }, { status: 400 });
    }

    const parsedItems = items
      .map((item) => ({
        productId: String(item.productId),
        name: String(item.name),
        price: Number(item.price),
        quantity: Number(item.quantity),
        vendorId: item.vendorId ? String(item.vendorId) : null,
      }))
      .filter((item) => item.productId && item.name && item.price > 0 && item.quantity > 0);

    if (parsedItems.length === 0) {
      return NextResponse.json({ error: "No valid checkout items provided" }, { status: 400 });
    }

    let customer = await getCustomerByEmail(customerEmail);
    if (!customer) {
      customer = await createCustomer({
        id: `cus-${randomUUID()}`,
        name: customerName,
        email: customerEmail,
        phone: customerPhone || "N/A",
        address: shippingAddress || "N/A",
        totalOrders: 0,
        totalSpent: 0,
      });
    }

    const lineTotals = parsedItems.map((item) => Math.round(Number(item.price) * Number(item.quantity)));
    const subtotal = lineTotals.reduce((sum, v) => sum + v, 0);
    const tax = Math.round(subtotal * 0.08);
    const total = subtotal + tax;

    const checkoutId = `chk-${randomUUID()}`;
    const reference = `MYG-${checkoutId}`;
    const { brandId } = getPaytotaConfig();
    const supabase = createAdminClient();

    const { error: createCheckoutError } = await supabase.from("checkout_sessions").insert({
      id: checkoutId,
      customer_id: customer.id,
      checkout_type: "product",
      status: "review",
      currency: "UGX",
      subtotal_amount: subtotal,
      tax_amount: tax,
      total_amount: total,
      payment_provider: "paytota",
      metadata: {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        shipping_address: shippingAddress || null,
      },
    });
    if (createCheckoutError) throw new Error(createCheckoutError.message);

    for (const item of parsedItems) {
      const { error } = await supabase.rpc("upsert_checkout_line_item", {
        p_line_item_id: `cli-${randomUUID()}`,
        p_checkout_id: checkoutId,
        p_line_type: "product",
        p_title: item.name,
        p_quantity: item.quantity,
        p_unit_amount: item.price,
        p_product_id: item.productId,
        p_vendor_id: item.vendorId,
        p_metadata: {},
      });
      if (error) throw new Error(error.message);
    }

    const { error: markReadyError } = await supabase.rpc("mark_checkout_ready_for_payment", {
      p_checkout_id: checkoutId,
      p_idempotency_key: `idem-${checkoutId}`,
    });
    if (markReadyError) throw new Error(markReadyError.message);

    const purchasePayload: Record<string, unknown> = {
      client: {
        email: customerEmail,
        phone: customerPhone,
        country: "UG",
        full_name: customerName,
        street_address: shippingAddress,
      },
      purchase: {
        currency: "UGX",
        products: parsedItems.map((item) => ({
          name: item.name,
          price: String(Number((item.price * item.quantity).toFixed(0))),
        })),
      },
      reference,
      skip_capture: getPaytotaSkipCapture(),
      brand_id: brandId,
      payment_method_whitelist: getPaytotaPaymentMethodWhitelist(),
    };

    purchasePayload.success_redirect =
      successRedirect || getPaytotaSuccessRedirectUrl({ checkoutId });
    purchasePayload.failure_redirect =
      failureRedirect || getPaytotaFailureRedirectUrl({ checkoutId });
    purchasePayload.cancel_redirect = getPaytotaCancelRedirectUrl({ checkoutId });

    const purchase = await createPurchase(purchasePayload);
    const providerReference = String(purchase.id ?? "");
    const checkoutUrl = String(purchase.checkout_url ?? "");

    if (!providerReference || !checkoutUrl) {
      throw new Error("Paytota purchase response missing id or checkout_url");
    }

    const { error: updateCheckoutError } = await supabase
      .from("checkout_sessions")
      .update({ payment_reference: providerReference })
      .eq("id", checkoutId);
    if (updateCheckoutError) throw new Error(updateCheckoutError.message);

    const { error: txError } = await supabase.from("paytota_transactions").insert({
      id: `ptx-${randomUUID()}`,
      transaction_type: "collection",
      direction: "inbound",
      checkout_id: checkoutId,
      customer_id: customer.id,
      currency: "UGX",
      amount: total,
      provider_reference: providerReference,
      provider_status: String(purchase.status ?? "created"),
      status: "processing",
      request_payload: purchasePayload,
      response_payload: purchase,
      webhook_payload: {},
    });
    if (txError) throw new Error(txError.message);

    return NextResponse.json(
      {
        checkoutId,
        paymentReference: providerReference,
        checkoutUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initialize checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

