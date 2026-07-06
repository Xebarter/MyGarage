import type { SubscriptionTier } from "@/lib/subscription-plans";
import { getSubscriptionPlan } from "@/lib/subscription-plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type BuyerSubscriptionStatus = "pending" | "active" | "cancelled" | "past_due" | "expired";

export type BuyerSubscription = {
  id: string;
  customerId: string;
  planTier: SubscriptionTier;
  status: BuyerSubscriptionStatus;
  billingInterval: string;
  amount: number;
  currency: string;
  checkoutId: string | null;
  startedAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type BuyerSubscriptionRow = {
  id: string;
  customer_id: string;
  plan_tier: SubscriptionTier;
  status: BuyerSubscriptionStatus;
  billing_interval: string;
  amount: number | string;
  currency: string;
  checkout_id: string | null;
  started_at: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

function newId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function rowToSubscription(row: BuyerSubscriptionRow): BuyerSubscription {
  return {
    id: row.id,
    customerId: row.customer_id,
    planTier: row.plan_tier,
    status: row.status,
    billingInterval: row.billing_interval,
    amount: Number(row.amount) || 0,
    currency: row.currency,
    checkoutId: row.checkout_id,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function getActiveBuyerSubscription(customerId: string): Promise<BuyerSubscription | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_subscriptions")
    .select("*")
    .eq("customer_id", customerId)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getActiveBuyerSubscription failed: ${error.message}`);
  if (!data) return null;
  return rowToSubscription(data as BuyerSubscriptionRow);
}

export async function listBuyerSubscriptionHistory(customerId: string): Promise<BuyerSubscription[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_subscriptions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(`listBuyerSubscriptionHistory failed: ${error.message}`);
  return (data ?? []).map((row) => rowToSubscription(row as BuyerSubscriptionRow));
}

async function cancelActiveSubscriptions(customerId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("buyer_subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("customer_id", customerId)
    .in("status", ["active", "pending"]);

  if (error) throw new Error(`cancelActiveSubscriptions failed: ${error.message}`);
}

function periodEndFromNow(): Date {
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  return end;
}

export async function createPendingSubscription(
  customerId: string,
  planTier: SubscriptionTier,
  checkoutId?: string | null,
): Promise<BuyerSubscription> {
  const plan = getSubscriptionPlan(planTier);
  await cancelActiveSubscriptions(customerId);

  const supabase = createAdminClient();
  const id = newId();
  const status = plan.monthlyPrice === 0 ? "active" : checkoutId ? "pending" : "pending";

  const row = {
    id,
    customer_id: customerId,
    plan_tier: planTier,
    status: plan.monthlyPrice === 0 ? "active" : status,
    billing_interval: "monthly",
    amount: plan.monthlyPrice,
    currency: plan.currency,
    checkout_id: checkoutId ?? null,
    started_at: plan.monthlyPrice === 0 ? new Date().toISOString() : null,
    current_period_end: plan.monthlyPrice === 0 ? periodEndFromNow().toISOString() : null,
  };

  const { data, error } = await supabase.from("buyer_subscriptions").insert(row).select("*").single();
  if (error) throw new Error(`createPendingSubscription failed: ${error.message}`);
  return rowToSubscription(data as BuyerSubscriptionRow);
}

export async function activateSubscriptionByCheckout(checkoutId: string): Promise<BuyerSubscription | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_subscriptions")
    .select("*")
    .eq("checkout_id", checkoutId)
    .eq("status", "pending")
    .maybeSingle();

  if (error) throw new Error(`activateSubscriptionByCheckout lookup failed: ${error.message}`);
  if (!data) return null;

  const now = new Date();
  const periodEnd = periodEndFromNow();

  const { data: updated, error: updateError } = await supabase
    .from("buyer_subscriptions")
    .update({
      status: "active",
      started_at: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    })
    .eq("id", data.id)
    .select("*")
    .single();

  if (updateError) throw new Error(`activateSubscriptionByCheckout failed: ${updateError.message}`);
  return rowToSubscription(updated as BuyerSubscriptionRow);
}

export async function activateSubscriptionById(subscriptionId: string, customerId: string): Promise<BuyerSubscription | null> {
  const supabase = createAdminClient();
  const now = new Date();
  const periodEnd = periodEndFromNow();

  const { data, error } = await supabase
    .from("buyer_subscriptions")
    .update({
      status: "active",
      started_at: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    })
    .eq("id", subscriptionId)
    .eq("customer_id", customerId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`activateSubscriptionById failed: ${error.message}`);
  if (!data) return null;
  return rowToSubscription(data as BuyerSubscriptionRow);
}

export async function cancelBuyerSubscription(customerId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("customer_id", customerId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`cancelBuyerSubscription failed: ${error.message}`);
  return Boolean(data);
}
