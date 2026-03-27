import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendorId");

    if (!vendorId) {
      return NextResponse.json({ error: "vendorId is required" }, { status: 400 });
    }

    const [vendorRes, paymentsRes, disbursementsRes, accountRes] = await Promise.all([
      supabase.from("vendors").select("id,name").eq("id", vendorId).maybeSingle(),
      supabase
        .from("paytota_transactions")
        .select("id,amount,status,provider_reference,created_at,checkout_id,service_payment_id")
        .eq("vendor_id", vendorId)
        .eq("transaction_type", "collection")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("admin_disbursements")
        .select("id,source_type,net_amount,status,created_at")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("vendor_payout_accounts")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("is_default", true)
        .maybeSingle(),
    ]);
    if (vendorRes.error) throw new Error(vendorRes.error.message);
    if (paymentsRes.error) throw new Error(paymentsRes.error.message);
    if (disbursementsRes.error) throw new Error(disbursementsRes.error.message);
    if (accountRes.error) throw new Error(accountRes.error.message);

    const paymentHistory = (paymentsRes.data ?? []).map((row) => ({
      id: row.id,
      checkoutType: row.checkout_id ? "product" : "service",
      amount: Number(row.amount ?? 0),
      status: row.status,
      providerReference: row.provider_reference ?? "",
      createdAt: row.created_at,
    }));

    const disbursements = (disbursementsRes.data ?? []).map((row) => ({
      id: row.id,
      sourceType: row.source_type,
      netAmount: Number(row.net_amount ?? 0),
      status: row.status,
      createdAt: row.created_at,
    }));

    const productGross = paymentHistory
      .filter((p) => p.checkoutType === "product" && p.status === "succeeded")
      .reduce((sum, p) => sum + p.amount, 0);
    const serviceGross = paymentHistory
      .filter((p) => p.checkoutType === "service" && p.status === "succeeded")
      .reduce((sum, p) => sum + p.amount, 0);
    const totalGross = productGross + serviceGross;
    const estimatedFees = Number((totalGross * 0.05).toFixed(0));
    const netEarnings = totalGross - estimatedFees;
    const paidOut = disbursements
      .filter((d) => d.status === "paid")
      .reduce((sum, d) => sum + d.netAmount, 0);
    const pendingDisbursement = disbursements
      .filter((d) => ["pending_approval", "approved", "processing"].includes(d.status))
      .reduce((sum, d) => sum + d.netAmount, 0);
    const availableBalance = Math.max(0, netEarnings - paidOut - pendingDisbursement);

    const account = accountRes.data;
    const preference = account
      ? {
          payoutMethod: account.account_type,
          payoutAccountName: account.account_name,
          payoutAccountNumber: account.account_number,
          network: account.network ?? "",
          frequency: (account.metadata?.frequency as string | undefined) ?? "weekly",
          minimumPayoutAmount: Number(account.metadata?.minimum_payout_amount ?? 0),
          autoDisburseEnabled: Boolean(account.metadata?.auto_disburse_enabled ?? true),
          nextPayoutDate: (account.metadata?.next_payout_date as string | undefined) ?? null,
        }
      : null;

    return NextResponse.json({
      vendorId,
      vendorName: vendorRes.data?.name ?? "Vendor",
      summary: {
        productGross,
        serviceGross,
        totalGross,
        estimatedFees,
        netEarnings,
        paidOut,
        pendingDisbursement,
        availableBalance,
      },
      paymentHistory,
      disbursements,
      preference,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch funds data" }, { status: 500 });
  }
}
