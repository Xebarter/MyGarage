import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { executePurchaseS2S } from "@/lib/paytota";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const purchaseId = String(body?.purchaseId ?? "").trim();

    if (!purchaseId) {
      return NextResponse.json({ error: "purchaseId is required" }, { status: 400 });
    }

    const response = await executePurchaseS2S(purchaseId);
    const providerStatus = String(response.status ?? "pending");

    // Best-effort: update our transaction record if it exists.
    // Purchase "execute" can happen even if the original initiation wasn't done from this server.
    const supabase = createAdminClient();
    await supabase
      .from("paytota_transactions")
      .update({ provider_status: providerStatus, status: "processing" })
      .eq("provider_reference", purchaseId);

    return NextResponse.json({ purchaseId, providerStatus, response });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to execute purchase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

