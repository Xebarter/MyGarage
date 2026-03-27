import type { AdApplication } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";

type AdApplicationRow = {
  id: string;
  vendor_id: string;
  scope: "single" | "all";
  product_id: string | null;
  product_name: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
};

export type AdApplicationInsert = Omit<AdApplication, "id" | "status" | "createdAt" | "updatedAt"> & { id?: string };

function rowToAdApplication(row: AdApplicationRow): AdApplication {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    scope: row.scope,
    productId: row.product_id ?? undefined,
    productName: row.product_name ?? undefined,
    message: row.message ?? undefined,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function listAdApplications(): Promise<AdApplication[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ad_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Supabase list ad applications failed: ${error.message}`);
  }

  return (data as AdApplicationRow[] | null)?.map(rowToAdApplication) ?? [];
}

export async function getAdApplicationById(id: string): Promise<AdApplication | undefined> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("ad_applications").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`Supabase get ad application failed: ${error.message}`);
  }

  if (!data) return undefined;
  return rowToAdApplication(data as AdApplicationRow);
}

export async function insertAdApplication(application: AdApplicationInsert): Promise<AdApplication> {
  const supabase = createAdminClient();
  const id = application.id ?? Date.now().toString();
  const row = {
    id,
    vendor_id: application.vendorId,
    scope: application.scope,
    product_id: application.productId ?? null,
    product_name: application.productName ?? null,
    message: application.message ?? null,
    status: "pending" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("ad_applications").insert(row).select("*").single();

  if (error) {
    throw new Error(`Supabase insert ad application failed: ${error.message}`);
  }

  return rowToAdApplication(data as AdApplicationRow);
}

export async function updateAdApplicationById(
  id: string,
  updates: Partial<AdApplication>,
): Promise<AdApplication | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};

  if (updates.scope !== undefined) patch.scope = updates.scope;
  if (updates.productId !== undefined) patch.product_id = updates.productId;
  if (updates.productName !== undefined) patch.product_name = updates.productName;
  if (updates.message !== undefined) patch.message = updates.message;
  if (updates.status !== undefined) patch.status = updates.status;

  if (Object.keys(patch).length === 0) {
    return getAdApplicationById(id).then((a) => a ?? null);
  }

  const { data, error } = await supabase
    .from("ad_applications")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase update ad application failed: ${error.message}`);
  }

  if (!data) return null;
  return rowToAdApplication(data as AdApplicationRow);
}
