import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { createPayout, executePayout } from "@/lib/paytota";

export async function GET() {
  try {
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

    const payments = (paymentsRes.data ?? []).map((row) => ({
      id: row.id,
      checkoutType: row.checkout_id ? "product" : "service",
      customerName: row.customer_id ?? "Customer",
      vendorName: row.vendor_id ?? "Vendor",
      amount: Number(row.amount ?? 0),
      currency: "UGX",
      provider: "paytota",
      providerReference: row.provider_reference ?? "",
      status: row.status,
      createdAt: row.created_at,
    }));

    const disbursements = (disbursementsRes.data ?? []).map((row) => ({
      id: row.id,
      vendorId: row.vendor_id,
      vendorName: row.vendor_name ?? "Vendor",
      sourceType: row.source_type,
      sourceReference: row.source_reference ?? "",
      grossAmount: Number(row.gross_amount ?? 0),
      feeAmount: Number(row.fee_amount ?? 0),
      netAmount: Number(row.net_amount ?? 0),
      currency: "UGX",
      status: row.status,
      payoutReference: row.payout_reference ?? undefined,
      scheduledFor: row.scheduled_for ?? undefined,
      paidOutAt: row.paid_out_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.created_at,
    }));

    return NextResponse.json({ payments, disbursements });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load payment operations data" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
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

      const payload = {
        client: {
          email: `vendor-${disbursement.vendor_id}@mygarage.local`,
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
        brand_id: process.env.PAYTOTA_BRAND_ID,
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
        p_actor_id: "admin-api",
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
      p_actor_id: "admin-api",
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
    return NextResponse.json(
      { error: "Failed to update disbursement" },
      { status: 500 },
    );
  }
}
