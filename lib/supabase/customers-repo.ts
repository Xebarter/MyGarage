import type { Customer } from "@/lib/db";
import { CUSTOMER_SEED_ROWS } from "@/lib/data/customer-seed";
import { createAdminClient } from "@/lib/supabase/admin";

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  total_orders: number;
  total_spent: number | string;
  created_at: string;
};

export type CustomerInsert = Omit<Customer, "id" | "createdAt"> & { id?: string };

function parseMoney(value: number | string): number {
  if (typeof value === "number") return value;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function rowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    address: row.address ?? "",
    totalOrders: Number(row.total_orders) || 0,
    totalSpent: parseMoney(row.total_spent),
    createdAt: new Date(row.created_at),
  };
}

async function ensureSeedIfEmpty(): Promise<void> {
  const supabase = createAdminClient();
  const { count, error: countError } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Supabase customers count failed: ${countError.message}`);
  }

  if (count !== null && count > 0) return;

  const { error } = await supabase.from("customers").insert(CUSTOMER_SEED_ROWS);
  if (error) {
    if (error.code === "23505") return;
    throw new Error(`Supabase seed customers failed: ${error.message}`);
  }
}

export async function listCustomers(): Promise<Customer[]> {
  await ensureSeedIfEmpty();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Supabase list customers failed: ${error.message}`);
  }

  return (data as CustomerRow[] | null)?.map(rowToCustomer) ?? [];
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  await ensureSeedIfEmpty();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`Supabase get customer failed: ${error.message}`);
  }

  if (!data) return undefined;
  return rowToCustomer(data as CustomerRow);
}

export async function insertCustomer(customer: CustomerInsert): Promise<Customer> {
  const supabase = createAdminClient();
  const id = customer.id ?? Date.now().toString();
  const row = {
    id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    total_orders: customer.totalOrders,
    total_spent: customer.totalSpent,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("customers").insert(row).select("*").single();

  if (error) {
    throw new Error(`Supabase insert customer failed: ${error.message}`);
  }

  return rowToCustomer(data as CustomerRow);
}

export async function updateCustomerById(id: string, updates: Partial<Customer>): Promise<Customer | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};

  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.email !== undefined) patch.email = updates.email;
  if (updates.phone !== undefined) patch.phone = updates.phone;
  if (updates.address !== undefined) patch.address = updates.address;
  if (updates.totalOrders !== undefined) patch.total_orders = updates.totalOrders;
  if (updates.totalSpent !== undefined) patch.total_spent = updates.totalSpent;

  if (Object.keys(patch).length === 0) {
    return getCustomerById(id).then((c) => c ?? null);
  }

  const { data, error } = await supabase.from("customers").update(patch).eq("id", id).select("*").maybeSingle();

  if (error) {
    throw new Error(`Supabase update customer failed: ${error.message}`);
  }

  if (!data) return null;
  return rowToCustomer(data as CustomerRow);
}
