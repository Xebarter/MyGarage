import { createAdminClient } from "@/lib/supabase/admin";

export interface BuyerAddress {
  id: string;
  customerId: string;
  label: string;
  fullAddress: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type BuyerAddressRow = {
  id: string;
  customer_id: string;
  label: string;
  full_address: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type BuyerAddressInsert = Omit<BuyerAddress, "id" | "createdAt" | "updatedAt"> & { id?: string };

function rowToBuyerAddress(row: BuyerAddressRow): BuyerAddress {
  return {
    id: row.id,
    customerId: row.customer_id,
    label: row.label,
    fullAddress: row.full_address,
    isDefault: row.is_default,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function listBuyerAddresses(customerId: string): Promise<BuyerAddress[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_addresses")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Supabase list buyer addresses failed: ${error.message}`);
  }

  return (data as BuyerAddressRow[] | null)?.map(rowToBuyerAddress) ?? [];
}

export async function insertBuyerAddress(address: BuyerAddressInsert): Promise<BuyerAddress> {
  const supabase = createAdminClient();
  const id = address.id ?? Date.now().toString();

  if (address.isDefault) {
    await supabase.from("buyer_addresses").update({ is_default: false }).eq("customer_id", address.customerId);
  }

  const row = {
    id,
    customer_id: address.customerId,
    label: address.label,
    full_address: address.fullAddress,
    is_default: address.isDefault,
  };

  const { data, error } = await supabase.from("buyer_addresses").insert(row).select("*").single();
  if (error) {
    throw new Error(`Supabase insert buyer address failed: ${error.message}`);
  }
  return rowToBuyerAddress(data as BuyerAddressRow);
}

export async function updateBuyerAddressById(id: string, updates: Partial<BuyerAddress>): Promise<BuyerAddress | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};

  if (updates.label !== undefined) patch.label = updates.label;
  if (updates.fullAddress !== undefined) patch.full_address = updates.fullAddress;
  if (updates.isDefault !== undefined) patch.is_default = updates.isDefault;

  if (updates.isDefault === true && updates.customerId) {
    await supabase.from("buyer_addresses").update({ is_default: false }).eq("customer_id", updates.customerId);
  }

  if (Object.keys(patch).length === 0) return null;

  const { data, error } = await supabase
    .from("buyer_addresses")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase update buyer address failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToBuyerAddress(data as BuyerAddressRow);
}

export async function deleteBuyerAddressById(id: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("buyer_addresses").delete().eq("id", id).select("id");
  if (error) {
    throw new Error(`Supabase delete buyer address failed: ${error.message}`);
  }
  return Boolean(data && data.length > 0);
}
