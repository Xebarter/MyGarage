import { createAdminClient } from "@/lib/supabase/admin";
import {
  CONTACT_MESSAGE_STATUSES,
  isContactMessageStatus,
  type ContactMessageStatus,
} from "@/lib/contact-messages";

export { CONTACT_MESSAGE_STATUSES, isContactMessageStatus };
export type { ContactMessageStatus };

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: ContactMessageStatus;
  adminNotes: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ContactMessageInsert = {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
};

export type ContactMessageStats = Record<ContactMessageStatus, number> & { total: number };

type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: ContactMessageStatus;
  admin_notes: string;
  created_at: string;
  updated_at: string;
};

function rowToContactMessage(row: ContactMessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    message: row.message,
    status: row.status,
    adminNotes: row.admin_notes ?? "",
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function serializeContactMessage(row: ContactMessage) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function sanitizeSearch(raw: string): string {
  return raw.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function insertContactMessage(input: ContactMessageInsert): Promise<ContactMessage> {
  const supabase = createAdminClient();
  const id = input.id ?? `cmsg-${crypto.randomUUID()}`;
  const { data, error } = await supabase
    .from("contact_messages")
    .insert({
      id,
      name: input.name,
      email: input.email,
      phone: input.phone ?? "",
      message: input.message,
      status: "new",
      admin_notes: "",
    })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to save contact message: ${error.message}`);
  return rowToContactMessage(data as ContactMessageRow);
}

export async function listContactMessages(opts?: {
  status?: ContactMessageStatus | "all";
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: ContactMessage[]; total: number }> {
  const supabase = createAdminClient();
  const limit = Math.min(200, Math.max(1, opts?.limit ?? 100));
  const offset = Math.max(0, opts?.offset ?? 0);
  const search = sanitizeSearch(opts?.search ?? "");

  let query = supabase
    .from("contact_messages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.status && opts.status !== "all") {
    query = query.eq("status", opts.status);
  }

  if (search) {
    const pattern = `"%${search}%"`;
    query = query.or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},message.ilike.${pattern}`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list contact messages: ${error.message}`);
  return {
    items: (data as ContactMessageRow[] | null)?.map(rowToContactMessage) ?? [],
    total: count ?? 0,
  };
}

export async function getContactMessageStats(): Promise<ContactMessageStats> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("contact_messages").select("status");
  if (error) throw new Error(`Failed to count contact messages: ${error.message}`);

  const stats: ContactMessageStats = {
    new: 0,
    read: 0,
    in_progress: 0,
    resolved: 0,
    archived: 0,
    total: 0,
  };
  for (const row of data ?? []) {
    const status = String((row as { status?: string }).status ?? "");
    if (isContactMessageStatus(status)) stats[status] += 1;
    stats.total += 1;
  }
  return stats;
}

export async function getContactMessageById(id: string): Promise<ContactMessage | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("contact_messages").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load contact message: ${error.message}`);
  if (!data) return null;
  return rowToContactMessage(data as ContactMessageRow);
}

export async function updateContactMessageById(
  id: string,
  updates: { status?: ContactMessageStatus; adminNotes?: string },
): Promise<ContactMessage | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.adminNotes !== undefined) patch.admin_notes = updates.adminNotes;

  if (Object.keys(patch).length === 0) {
    return getContactMessageById(id);
  }

  const { data, error } = await supabase
    .from("contact_messages")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Failed to update contact message: ${error.message}`);
  if (!data) return null;
  return rowToContactMessage(data as ContactMessageRow);
}

export async function deleteContactMessageById(id: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error, count } = await supabase.from("contact_messages").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error(`Failed to delete contact message: ${error.message}`);
  return Boolean(count);
}
