import { createAdminClient } from "@/lib/supabase/admin";

export interface BuyerSupportTicket {
  id: string;
  customerId: string;
  subject: string;
  message: string;
  orderId?: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: Date;
  updatedAt: Date;
}

type BuyerSupportTicketRow = {
  id: string;
  customer_id: string;
  subject: string;
  message: string;
  order_id: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at: string;
};

export type BuyerSupportTicketInsert = Omit<BuyerSupportTicket, "id" | "createdAt" | "updatedAt" | "status"> & {
  id?: string;
  status?: BuyerSupportTicket["status"];
};

function rowToBuyerSupportTicket(row: BuyerSupportTicketRow): BuyerSupportTicket {
  return {
    id: row.id,
    customerId: row.customer_id,
    subject: row.subject,
    message: row.message,
    orderId: row.order_id ?? undefined,
    status: row.status,
    priority: row.priority,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function listBuyerSupportTickets(customerId: string): Promise<BuyerSupportTicket[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_support_tickets")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Supabase list buyer support tickets failed: ${error.message}`);
  return (data as BuyerSupportTicketRow[] | null)?.map(rowToBuyerSupportTicket) ?? [];
}

export async function insertBuyerSupportTicket(ticket: BuyerSupportTicketInsert): Promise<BuyerSupportTicket> {
  const supabase = createAdminClient();
  const id = ticket.id ?? Date.now().toString();
  const row = {
    id,
    customer_id: ticket.customerId,
    subject: ticket.subject,
    message: ticket.message,
    order_id: ticket.orderId ?? null,
    status: ticket.status ?? "open",
    priority: ticket.priority,
  };
  const { data, error } = await supabase.from("buyer_support_tickets").insert(row).select("*").single();
  if (error) throw new Error(`Supabase insert buyer support ticket failed: ${error.message}`);
  return rowToBuyerSupportTicket(data as BuyerSupportTicketRow);
}
