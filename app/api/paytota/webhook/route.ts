import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaytotaSignature } from "@/lib/paytota";

function normalizeEventStatus(eventType: string, status: string): string {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus === "paid" || lowerStatus === "success") return "succeeded";
  if (lowerStatus === "error" || lowerStatus === "failed") return "failed";
  if (eventType.includes("pending") || lowerStatus === "pending") return "processing";
  if (lowerStatus === "cancelled" || lowerStatus === "canceled") return "cancelled";
  return "processing";
}

export async function POST(req: NextRequest) {
  try {
    const raw = Buffer.from(await req.arrayBuffer());
    const xSignature = req.headers.get("x-signature") || req.headers.get("signature");

    if (!verifyPaytotaSignature(raw, xSignature)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(raw.toString("utf-8")) as Record<string, unknown>;
    const eventType = String(payload.event_type ?? "");
    const providerReference = String(payload.id ?? "");
    const providerStatus = String(payload.status ?? "");

    if (!providerReference || !providerStatus) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (eventType.startsWith("purchase.")) {
      const { error: finalizeError } = await supabase.rpc("on_paytota_webhook_finalize_checkout", {
        p_provider_reference: providerReference,
        p_provider_status: providerStatus,
        p_payload: payload,
        p_transaction_id: null,
      });
      if (finalizeError) throw new Error(finalizeError.message);

      if (eventType === "purchase.paid") {
        const { data: tx, error: txError } = await supabase
          .from("paytota_transactions")
          .select("checkout_id")
          .eq("provider_reference", providerReference)
          .maybeSingle();
        if (txError) throw new Error(txError.message);

        if (tx?.checkout_id) {
          const checkoutId = tx.checkout_id;
          // Deterministic order id prevents duplicate webhook deliveries from orphaning disbursements.
          const deterministicOrderId = `ord-${checkoutId}`;

          const { error: materializeError } = await supabase.rpc("materialize_paid_product_checkout", {
            p_order_id: deterministicOrderId,
            p_checkout_id: checkoutId,
            p_delivery_address: null,
            p_notes: null,
          });

          let orderIdForDisbursement = deterministicOrderId;
          if (materializeError) {
            const msg = materializeError.message || "";
            if (!msg.includes("already materialized")) {
              throw new Error(msg);
            }

            // If the order already exists, use the actual id from DB.
            const { data: existingOrder, error: existingOrderError } = await supabase
              .from("product_orders")
              .select("id")
              .eq("checkout_id", checkoutId)
              .maybeSingle();
            if (existingOrderError) throw new Error(existingOrderError.message);
            if (existingOrder?.id) orderIdForDisbursement = existingOrder.id;
          }

          const { error: disbError } = await supabase.rpc("create_admin_disbursements_for_product_order", {
            p_order_id: orderIdForDisbursement,
            p_fee_percent: 0,
            p_initiated_by: "system",
          });
          if (disbError && !disbError.message.includes("null value")) {
            throw new Error(disbError.message);
          }
        }
      }
    } else if (eventType.startsWith("payout.")) {
      const normalized = normalizeEventStatus(eventType, providerStatus);
      const { error: finalizeError } = await supabase.rpc("on_paytota_webhook_finalize_checkout", {
        p_provider_reference: providerReference,
        p_provider_status: normalized,
        p_payload: payload,
        p_transaction_id: null,
      });
      if (finalizeError) throw new Error(finalizeError.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

