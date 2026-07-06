import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  cancelBuyerSubscription,
  createPendingBuyerSubscription,
  getActiveBuyerSubscription,
  getCustomer,
  listBuyerSubscriptionHistory,
} from "@/lib/db";
import { SUBSCRIPTION_PLANS, getSubscriptionPlan, type SubscriptionTier } from "@/lib/subscription-plans";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPaytotaCancelRedirectUrl,
  getPaytotaFailureRedirectUrl,
  getPaytotaMobileCancelRedirectUrl,
  getPaytotaMobileFailureRedirectUrl,
  getPaytotaMobileSuccessRedirectUrl,
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

function normalizeUgPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("256")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `256${digits.slice(1)}`;
  if (digits.length === 9) return `256${digits}`;
  return digits;
}

async function resolveCustomer(customerId: string) {
  const customer = await getCustomer(customerId);
  if (!customer) return null;
  return customer;
}

async function startPaidSubscriptionCheckout(opts: {
  customerId: string;
  planTier: SubscriptionTier;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  platform?: string;
  successRedirect?: string;
  failureRedirect?: string;
}) {
  const plan = getSubscriptionPlan(opts.planTier);
  const checkoutId = `chk-sub-${randomUUID()}`;
  const { brandId } = getPaytotaConfig();
  const supabase = createAdminClient();
  const total = plan.monthlyPrice;

  const minUgx = getPaytotaMinPurchaseUgx();
  if (minUgx != null && total < minUgx) {
    throw new Error(
      `Subscription price (${total} UGX) is below Paytota minimum (${minUgx} UGX). Set PAYTOTA_MIN_PURCHASE_UGX=0 to skip.`,
    );
  }

  const subscription = await createPendingBuyerSubscription(opts.customerId, opts.planTier, checkoutId);

  const { error: createCheckoutError } = await supabase.from("checkout_sessions").insert({
    id: checkoutId,
    customer_id: opts.customerId,
    checkout_type: "subscription",
    status: "review",
    currency: plan.currency,
    subtotal_amount: total,
    tax_amount: 0,
    total_amount: total,
    payment_provider: "paytota",
    metadata: {
      subscription_plan: opts.planTier,
      subscription_id: subscription.id,
      customer_name: opts.customerName,
      customer_email: opts.customerEmail,
      customer_phone: opts.customerPhone || null,
    },
  });
  if (createCheckoutError) throw new Error(createCheckoutError.message);

  const { error: lineError } = await supabase.rpc("upsert_checkout_line_item", {
    p_line_item_id: `cli-${randomUUID()}`,
    p_checkout_id: checkoutId,
    p_line_type: "subscription",
    p_title: `${plan.name} Membership (monthly)`,
    p_quantity: 1,
    p_unit_amount: total,
    p_product_id: null,
    p_vendor_id: null,
    p_metadata: { plan_tier: opts.planTier },
  });
  if (lineError) throw new Error(lineError.message);

  const { error: markReadyError } = await supabase.rpc("mark_checkout_ready_for_payment", {
    p_checkout_id: checkoutId,
    p_idempotency_key: `idem-${checkoutId}`,
  });
  if (markReadyError) throw new Error(markReadyError.message);

  const reference = `MYG-SUB-${checkoutId}`;
  const platform = opts.platform?.toLowerCase() ?? "";

  const purchasePayload: Record<string, unknown> = {
    client: {
      email: opts.customerEmail,
      phone: opts.customerPhone,
      country: "UG",
      full_name: opts.customerName,
    },
    purchase: {
      currency: plan.currency,
      products: [{ name: `${plan.name} Membership`, price: String(total) }],
    },
    reference,
    skip_capture: getPaytotaSkipCapture(),
    brand_id: brandId,
  };

  const methodWhitelist = getPaytotaPaymentMethodWhitelist();
  if (methodWhitelist) purchasePayload.payment_method_whitelist = methodWhitelist;

  purchasePayload.success_redirect =
    opts.successRedirect ||
    (platform === "mobile"
      ? getPaytotaMobileSuccessRedirectUrl({ checkoutId, kind: "subscription" })
      : getPaytotaSuccessRedirectUrl({ checkoutId, kind: "subscription" }));
  purchasePayload.failure_redirect =
    opts.failureRedirect ||
    (platform === "mobile"
      ? getPaytotaMobileFailureRedirectUrl({ checkoutId, kind: "subscription" })
      : getPaytotaFailureRedirectUrl({ checkoutId, kind: "subscription" }));
  purchasePayload.cancel_redirect =
    platform === "mobile"
      ? getPaytotaMobileCancelRedirectUrl({ checkoutId, kind: "subscription" })
      : getPaytotaCancelRedirectUrl({ checkoutId, kind: "subscription" });

  let purchase: Awaited<ReturnType<typeof createPurchase>>;
  try {
    purchase = await createPurchase(purchasePayload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("purchase_no_available_payment_method")) {
      throw new Error(
        `${msg} ${paytotaNoPaymentMethodHint({ brandId, currency: plan.currency, skipCapture: getPaytotaSkipCapture(), amountUgx: total, minUgx })}`,
      );
    }
    throw e;
  }

  const providerReference = String(purchase.id ?? "");
  const checkoutUrl = String(purchase.checkout_url ?? "");
  if (!providerReference || !checkoutUrl) {
    throw new Error("Paytota purchase response missing id or checkout_url");
  }

  const { error: txError } = await supabase.from("paytota_transactions").insert({
    id: `ptx-${randomUUID()}`,
    checkout_id: checkoutId,
    customer_id: opts.customerId,
    transaction_type: "collection",
    direction: "inbound",
    provider_reference: providerReference,
    provider_status: String(purchase.status ?? "created"),
    status: "processing",
    currency: plan.currency,
    amount: total,
    request_payload: purchasePayload,
    response_payload: purchase,
    webhook_payload: {},
  });
  if (txError) throw new Error(txError.message);

  const { error: updateCheckoutError } = await supabase
    .from("checkout_sessions")
    .update({ payment_reference: providerReference })
    .eq("id", checkoutId);
  if (updateCheckoutError) throw new Error(updateCheckoutError.message);

  return { subscription, checkoutId, checkoutUrl, providerReference };
}

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customerId")?.trim();
    const payload: Record<string, unknown> = { plans: SUBSCRIPTION_PLANS };

    if (customerId) {
      const [active, history] = await Promise.all([
        getActiveBuyerSubscription(customerId),
        listBuyerSubscriptionHistory(customerId),
      ]);
      payload.subscription = active;
      payload.history = history;
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[buyer/subscriptions GET]", error);
    return NextResponse.json({ error: "Failed to load subscriptions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const customerId = String(body?.customerId ?? "").trim();
    const planTier = String(body?.planTier ?? "").trim().toLowerCase() as SubscriptionTier;

    if (!customerId || !planTier) {
      return NextResponse.json({ error: "customerId and planTier are required" }, { status: 400 });
    }

    if (!["platinum", "gold", "silver", "bronze"].includes(planTier)) {
      return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
    }

    const customer = await resolveCustomer(customerId);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const plan = getSubscriptionPlan(planTier);
    const customerPhone = normalizeUgPhone(String(body?.customerPhone ?? customer.phone ?? ""));

    if (plan.monthlyPrice === 0) {
      const subscription = await createPendingBuyerSubscription(customerId, planTier);
      return NextResponse.json({ subscription, checkoutUrl: null });
    }

    if (!customerPhone) {
      return NextResponse.json({ error: "customerPhone is required for paid subscriptions" }, { status: 400 });
    }

    const result = await startPaidSubscriptionCheckout({
      customerId,
      planTier,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone,
      platform: body?.platform,
      successRedirect: body?.successRedirect,
      failureRedirect: body?.failureRedirect,
    });

    return NextResponse.json({
      subscription: result.subscription,
      checkoutId: result.checkoutId,
      checkoutUrl: result.checkoutUrl,
    });
  } catch (error) {
    console.error("[buyer/subscriptions POST]", error);
    const message = error instanceof Error ? error.message : "Failed to subscribe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customerId")?.trim();
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const cancelled = await cancelBuyerSubscription(customerId);
    if (!cancelled) {
      return NextResponse.json({ error: "No active subscription to cancel" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[buyer/subscriptions DELETE]", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
