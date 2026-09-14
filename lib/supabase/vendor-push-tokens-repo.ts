import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

export type PushPlatform = "android" | "ios" | "web";

function isMissingTableError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  const code = (error.code || "").toUpperCase();
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table") ||
    msg.includes("does not exist")
  );
}

export async function upsertVendorPushToken(args: {
  vendorId: string;
  token: string;
  platform?: string;
}): Promise<void> {
  const vendorId = args.vendorId.trim();
  const token = args.token.trim();
  if (!vendorId || token.length < 8) return;

  const platform: PushPlatform =
    args.platform === "ios" || args.platform === "web" ? args.platform : "android";

  const supabase = createAdminClient();
  const { data: existing, error: findError } = await supabase
    .from("vendor_push_tokens")
    .select("id")
    .eq("token", token)
    .maybeSingle();
  if (findError) {
    if (isMissingTableError(findError)) return;
    throw new Error(findError.message);
  }

  const now = new Date().toISOString();
  if (existing?.id) {
    const { error } = await supabase
      .from("vendor_push_tokens")
      .update({ vendor_id: vendorId, platform, updated_at: now })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("vendor_push_tokens").insert({
    id: `vpt-${randomUUID()}`,
    vendor_id: vendorId,
    token,
    platform,
  });
  if (error) {
    if (isMissingTableError(error)) return;
    throw new Error(error.message);
  }
}

export async function deleteVendorPushToken(vendorId: string, token?: string): Promise<void> {
  const id = vendorId.trim();
  if (!id) return;
  const supabase = createAdminClient();
  let query = supabase.from("vendor_push_tokens").delete().eq("vendor_id", id);
  if (token?.trim()) query = query.eq("token", token.trim());
  const { error } = await query;
  if (error && !isMissingTableError(error)) throw new Error(error.message);
}

export async function listPushTokensForVendor(vendorId: string): Promise<string[]> {
  const id = vendorId.trim();
  if (!id) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("vendor_push_tokens").select("token").eq("vendor_id", id);
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }
  return ((data as Array<{ token: string }> | null) ?? []).map((row) => row.token).filter(Boolean);
}

export async function listVendorIdsWithPushTokens(): Promise<Set<string>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("vendor_push_tokens").select("vendor_id");
  if (error) {
    if (isMissingTableError(error)) return new Set();
    throw new Error(error.message);
  }
  const ids = new Set<string>();
  for (const row of data ?? []) {
    const vendorId = (row as { vendor_id?: string }).vendor_id;
    if (vendorId) ids.add(vendorId);
  }
  return ids;
}

export async function deletePushTokenValue(token: string): Promise<void> {
  const value = token.trim();
  if (!value) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("vendor_push_tokens").delete().eq("token", value);
  if (error && !isMissingTableError(error)) throw new Error(error.message);
}
