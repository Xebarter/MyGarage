import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomer, getCustomerByEmail } from "@/lib/db";
import {
  getPaytotaCancelRedirectUrl,
  getPaytotaFailureRedirectUrl,
  getPaytotaSuccessRedirectUrl,
} from "@/lib/app-url";
import {
  createPurchase,
  getPaytotaConfig,
  getPaytotaMinPurchaseUgx,
  getPaytotaPaymentMethodWhitelist,
  getPaytotaSkipCapture,
  paytotaNoPaymentMethodHint,
} from "@/lib/paytota";

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
      }))
      .filter((item) => item.productId && item.name && item.price > 0 && item.quantity > 0);

    if (parsedItems.length === 0) {
      return NextResponse.json({ error: "No valid checkout items provided" }, { status: 400 });
    }

    const checkoutId = `chk-${randomUUID()}`;
    const { brandId } = getPaytotaConfig();
    const supabase = createAdminClient();

    const productIds = [...new Set(parsedItems.map((i) => i.productId))];
    const { data: productRows, error: productsLookupError } = await supabase
      .from("products")
      .select("id, vendor_id")
      .in("id", productIds);
    if (productsLookupError) throw new Error(productsLookupError.message);

    const vendorIdByProductId = new Map((productRows ?? []).map((r) => [r.id, r.vendor_id]));
    for (const id of productIds) {
      if (!vendorIdByProductId.has(id)) {
        return NextResponse.json(
          { error: "One or more products are unavailable or could not be found" },
          { status: 400 },
        );
      }
    }

    const vendorIdsFromProducts = [...new Set(productIds.map((id) => vendorIdByProductId.get(id)!))];
    const { data: vendorRows, error: vendorsLookupError } = await supabase
      .from("vendors")
      .select("id")
      .in("id", vendorIdsFromProducts);
    if (vendorsLookupError) throw new Error(vendorsLookupError.message);
    const existingVendorIds = new Set((vendorRows ?? []).map((v) => v.id));
    const missingVendor = vendorIdsFromProducts.find((vid) => !existingVendorIds.has(vid));
    if (missingVendor !== undefined) {
      return NextResponse.json(
        {
          error:
            "A product in your cart is linked to a seller record that no longer exists. Remove the item or contact support.",
        },
        { status: 400 },
      );
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

    const minUgx = getPaytotaMinPurchaseUgx();
    if (minUgx != null && total < minUgx) {
      return NextResponse.json(
        {
          error: `Order total (${total} UGX) is below the minimum Paytota collection amount (${minUgx} UGX). Use prices in whole UGX or set PAYTOTA_MIN_PURCHASE_UGX=0 to skip this check.`,
        },
        { status: 400 },
      );
    }

    const reference = `MYG-${checkoutId}`;

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
      const vendorId = vendorIdByProductId.get(item.productId) ?? null;
      const { error } = await supabase.rpc("upsert_checkout_line_item", {
        p_line_item_id: `cli-${randomUUID()}`,
        p_checkout_id: checkoutId,
        p_line_type: "product",
        p_title: item.name,
        p_quantity: item.quantity,
        p_unit_amount: item.price,
        p_product_id: item.productId,
        p_vendor_id: vendorId,
        p_metadata: {},
      });
      if (error) throw new Error(error.message);
    }

    const { error: markReadyError } = await supabase.rpc("mark_checkout_ready_for_payment", {
      p_checkout_id: checkoutId,
      p_idempotency_key: `idem-${checkoutId}`,
    });
    if (markReadyError) throw new Error(markReadyError.message);

    const paytotaProducts: { name: string; price: string }[] = parsedItems.map((item, idx) => ({
      name: item.name,
      price: String(lineTotals[idx]!),
    }));
    if (tax > 0) paytotaProducts.push({ name: "Tax", price: String(tax) });

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
        products: paytotaProducts,
      },
      reference,
      skip_capture: getPaytotaSkipCapture(),
      brand_id: brandId,
    };

    const methodWhitelist = getPaytotaPaymentMethodWhitelist();
    if (methodWhitelist) purchasePayload.payment_method_whitelist = methodWhitelist;

    purchasePayload.success_redirect =
      successRedirect || getPaytotaSuccessRedirectUrl({ checkoutId });
    purchasePayload.failure_redirect =
      failureRedirect || getPaytotaFailureRedirectUrl({ checkoutId });
    purchasePayload.cancel_redirect = getPaytotaCancelRedirectUrl({ checkoutId });

    let purchase: Awaited<ReturnType<typeof createPurchase>>;
    try {
      purchase = await createPurchase(purchasePayload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("purchase_no_available_payment_method")) {
        throw new Error(
          `${msg} ${paytotaNoPaymentMethodHint({
            brandId,
            currency: "UGX",
            skipCapture: getPaytotaSkipCapture(),
            amountUgx: total,
            minUgx,
          })}`,
        );
      }
      throw e;
    }
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

