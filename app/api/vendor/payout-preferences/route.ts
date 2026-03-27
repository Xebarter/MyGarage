import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendorId");
    if (!vendorId) {
      return NextResponse.json({ error: "vendorId is required" }, { status: 400 });
    }

    const { data: account, error } = await supabase
      .from("vendor_payout_accounts")
      .select("*")
      .eq("vendor_id", vendorId)
      .eq("is_default", true)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const preference = account
      ? {
          vendorId,
          payoutMethod: account.account_type,
          payoutAccountName: account.account_name,
          payoutAccountNumber: account.account_number,
          network: account.network ?? "",
          currency: "UGX",
          frequency: (account.metadata?.frequency as string | undefined) ?? "weekly",
          minimumPayoutAmount: Number(account.metadata?.minimum_payout_amount ?? 0),
          autoDisburseEnabled: Boolean(account.metadata?.auto_disburse_enabled ?? true),
          nextPayoutDate: account.metadata?.next_payout_date ?? null,
          updatedAt: account.updated_at,
        }
      : null;
    return NextResponse.json(preference);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch payout preference" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const {
      vendorId,
      payoutMethod,
      payoutAccountName,
      payoutAccountNumber,
      network,
      frequency,
      minimumPayoutAmount,
      autoDisburseEnabled,
      nextPayoutDate,
    } = body ?? {};

    if (!vendorId) {
      return NextResponse.json({ error: "vendorId is required" }, { status: 400 });
    }

    await supabase
      .from("vendor_payout_accounts")
      .update({ is_default: false })
      .eq("vendor_id", vendorId)
      .eq("is_default", true);

    const payload = {
      id: `vpa-${randomUUID()}`,
      vendor_id: vendorId,
      provider: "paytota",
      account_type: payoutMethod,
      account_name: payoutAccountName,
      account_number: payoutAccountNumber,
      network: network || null,
      is_default: true,
      is_verified: false,
      metadata: {
        frequency,
        minimum_payout_amount: Number(minimumPayoutAmount ?? 0),
        auto_disburse_enabled: Boolean(autoDisburseEnabled),
        next_payout_date: nextPayoutDate || null,
      },
    };

    const { data: updated, error } = await supabase
      .from("vendor_payout_accounts")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({
      vendorId,
      payoutMethod: updated.account_type,
      payoutAccountName: updated.account_name,
      payoutAccountNumber: updated.account_number,
      network: updated.network ?? "",
      currency: "UGX",
      frequency: (updated.metadata?.frequency as string | undefined) ?? "weekly",
      minimumPayoutAmount: Number(updated.metadata?.minimum_payout_amount ?? 0),
      autoDisburseEnabled: Boolean(updated.metadata?.auto_disburse_enabled ?? true),
      nextPayoutDate: updated.metadata?.next_payout_date ?? null,
      updatedAt: updated.updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update payout preference" },
      { status: 500 },
    );
  }
}
