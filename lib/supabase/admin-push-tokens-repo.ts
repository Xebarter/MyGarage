import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

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

export async function upsertAdminPushToken(args: {
  userId: string;
  token: string;
  platform?: string;
}): Promise<void> {
  const userId = args.userId.trim();
  const token = args.token.trim();
  if (!userId || token.length < 8) return;

  const platform = args.platform === "android" || args.platform === "ios" ? args.platform : "web";
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing, error: findError } = await supabase
    .from("admin_push_tokens")
    .select("id")
    .eq("token", token)
    .maybeSingle();
  if (findError) {
    if (isMissingTableError(findError)) return;
    throw new Error(findError.message);
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("admin_push_tokens")
      .update({ user_id: userId, platform, last_seen_at: now, updated_at: now })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("admin_push_tokens").insert({
    id: `apt-${randomUUID()}`,
    user_id: userId,
    token,
    platform,
    last_seen_at: now,
  });
  if (error) {
    if (isMissingTableError(error)) return;
    throw new Error(error.message);
  }
}

export async function deleteAdminPushToken(userId: string, token?: string): Promise<void> {
  const id = userId.trim();
  if (!id) return;
  const supabase = createAdminClient();
  let query = supabase.from("admin_push_tokens").delete().eq("user_id", id);
  if (token?.trim()) query = query.eq("token", token.trim());
  const { error } = await query;
  if (error && !isMissingTableError(error)) throw new Error(error.message);
}

export async function listAdminPushTokens(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("admin_push_tokens").select("token");
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }
  return ((data as Array<{ token: string }> | null) ?? []).map((row) => row.token).filter(Boolean);
}

export async function deleteAdminPushTokenValue(token: string): Promise<void> {
  const value = token.trim();
  if (!value) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("admin_push_tokens").delete().eq("token", value);
  if (error && !isMissingTableError(error)) throw new Error(error.message);
}
