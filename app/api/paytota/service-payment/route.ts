import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";
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
    let servicePaymentId = String(body?.servicePaymentId ?? "").trim();
    const requestId = String(body?.requestId ?? "").trim();
    const amountFromClient = Number(body?.amount ?? 0);
    const customerId = String(body?.customerId ?? "").trim();
    const providerId = String(body?.providerId ?? "").trim();
    const customerEmail = String(body?.customerEmail ?? "").trim().toLowerCase();
    const customerPhone = normalizeUgPhone(String(body?.customerPhone ?? "").trim());
    const customerName = String(body?.customerName ?? "").trim();

    if (!servicePaymentId && !requestId) {
      return NextResponse.json({ error: "servicePaymentId or requestId is required" }, { status: 400 });
    }
    if (!customerEmail || !customerName) {
      return NextResponse.json(
        { error: "customerEmail and customerName are required" },
        { status: 400 },
      );
    }
    if (!customerPhone) {
      return NextResponse.json({ error: "customerPhone is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!servicePaymentId && requestId) {
      const { data: existing, error: existingError } = await supabase
        .from("service_payments")
        .select("id")
        .eq("request_id", requestId)
        .in("status", ["pending", "authorized", "captured"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);

      if (existing?.id) {
        servicePaymentId = existing.id;
      } else {
        if (!customerId || amountFromClient <= 0) {
          return NextResponse.json(
            { error: "customerId and positive amount are required when creating from requestId" },
            { status: 400 },
          );
        }
        const newPaymentId = `spay-${randomUUID()}`;
        const { error: createPaymentError } = await supabase.from("service_payments").insert({
          id: newPaymentId,
          request_id: requestId,
          quote_id: null,
          customer_id: customerId,
          provider_id: providerId || null,
          currency: "UGX",
          amount: amountFromClient,
          payment_method: "mobile_money",
          payment_provider: "paytota",
          provider_reference: null,
          status: "pending",
        });
        if (createPaymentError) throw new Error(createPaymentError.message);
        servicePaymentId = newPaymentId;
      }
    }

    const { data: payment, error: paymentError } = await supabase
      .from("service_payments")
      .select("id,request_id,customer_id,provider_id,currency,amount,status")
      .eq("id", servicePaymentId)
      .maybeSingle();
    if (paymentError) throw new Error(paymentError.message);
    if (!payment) return NextResponse.json({ error: "Service payment not found" }, { status: 404 });

    const { brandId } = getPaytotaConfig();
    const amountUgx = Math.round(Number(payment.amount));
    if (payment.currency === "UGX") {
      const minUgx = getPaytotaMinPurchaseUgx();
      if (minUgx != null && amountUgx < minUgx) {
        return NextResponse.json(
          {
            error: `Payment amount (${amountUgx} UGX) is below the minimum Paytota collection amount (${minUgx} UGX).`,
          },
          { status: 400 },
        );
      }
    }

    const purchasePayload: Record<string, unknown> = {
      client: {
        email: customerEmail,
        phone: customerPhone,
        country: "UG",
        full_name: customerName,
      },
      purchase: {
        currency: payment.currency,
        products: [
          {
            name: `Service payment ${payment.request_id}`,
            price: String(amountUgx),
          },
        ],
      },
      reference: `SVC-${servicePaymentId}`,
      skip_capture: getPaytotaSkipCapture(),
      brand_id: brandId,
      success_redirect: getPaytotaSuccessRedirectUrl({
        servicePaymentId: payment.id,
        requestId: payment.request_id,
      }),
      failure_redirect: getPaytotaFailureRedirectUrl({
        servicePaymentId: payment.id,
        requestId: payment.request_id,
      }),
      cancel_redirect: getPaytotaCancelRedirectUrl({
        servicePaymentId: payment.id,
        requestId: payment.request_id,
      }),
    };

    const methodWhitelist = getPaytotaPaymentMethodWhitelist();
    if (methodWhitelist) purchasePayload.payment_method_whitelist = methodWhitelist;

    let purchase: Awaited<ReturnType<typeof createPurchase>>;
    try {
      purchase = await createPurchase(purchasePayload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("purchase_no_available_payment_method") && payment.currency === "UGX") {
        throw new Error(
          `${msg} ${paytotaNoPaymentMethodHint({
            brandId,
            currency: payment.currency,
            skipCapture: getPaytotaSkipCapture(),
            amountUgx,
            minUgx: getPaytotaMinPurchaseUgx(),
          })}`,
        );
      }
      throw e;
    }
    const providerReference = String(purchase.id ?? "");
    const checkoutUrl = String(purchase.checkout_url ?? "");
    if (!providerReference || !checkoutUrl) {
      throw new Error("Paytota service payment initialization failed");
    }

    const { error: txError } = await supabase.from("paytota_transactions").insert({
      id: `ptx-${randomUUID()}`,
      transaction_type: "collection",
      direction: "inbound",
      service_payment_id: payment.id,
      customer_id: payment.customer_id,
      vendor_id: payment.provider_id,
      currency: payment.currency,
      amount: Number(payment.amount),
      provider_reference: providerReference,
      provider_status: String(purchase.status ?? "created"),
      status: "processing",
      request_payload: purchasePayload,
      response_payload: purchase,
      webhook_payload: {},
    });
    if (txError) throw new Error(txError.message);

    return NextResponse.json({ servicePaymentId, paymentReference: providerReference, checkoutUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initialize service payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

