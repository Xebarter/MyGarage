import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

export type AssignmentResponse = "pending" | "accepted" | "declined" | "expired";

export type ServiceRequestAssignmentRow = {
  id: string;
  request_id: string;
  provider_id: string;
  assigned_at: string;
  responded_at: string | null;
  response: AssignmentResponse;
  response_note: string | null;
};

export type BuyerServiceRequestFullRow = {
  id: string;
  customer_id: string;
  category: string;
  service: string;
  location: string;
  status: string;
  provider_id: string | null;
  accepted_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  buyer_contact_phone: string | null;
  buyer_contact_name: string | null;
  created_at: string;
  updated_at: string;
};

export async function getBuyerServiceRequestFullRow(id: string): Promise<BuyerServiceRequestFullRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("buyer_service_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BuyerServiceRequestFullRow) ?? null;
}

export async function listAssignmentsForRequest(requestId: string): Promise<ServiceRequestAssignmentRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_request_assignments")
    .select("*")
    .eq("request_id", requestId)
    .order("assigned_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as ServiceRequestAssignmentRow[]) ?? [];
}

export async function getAssignmentById(id: string): Promise<ServiceRequestAssignmentRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("service_request_assignments").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ServiceRequestAssignmentRow) ?? null;
}

export async function insertPendingAssignment(requestId: string, providerId: string): Promise<ServiceRequestAssignmentRow> {
  const supabase = createAdminClient();
  const id = `asgn-${randomUUID()}`;
  const { data, error } = await supabase
    .from("service_request_assignments")
    .insert({
      id,
      request_id: requestId,
      provider_id: providerId,
      response: "pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ServiceRequestAssignmentRow;
}

export async function updateAssignmentResponse(
  assignmentId: string,
  response: AssignmentResponse,
  responseNote?: string | null,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("service_request_assignments")
    .update({
      response,
      responded_at: new Date().toISOString(),
      response_note: responseNote ?? null,
    })
    .eq("id", assignmentId);
  if (error) throw new Error(error.message);
}

export async function updateBuyerRequestDispatchFields(
  requestId: string,
  patch: {
    status?: string;
    provider_id?: string | null;
    accepted_at?: string | null;
    arrived_at?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
  },
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("buyer_service_requests").update(patch).eq("id", requestId);
  if (error) throw new Error(error.message);
}

type VendorDispatchRow = { id: string; rating: number | string; service_offerings: string[] | null };

export async function listVendorsForDispatch(): Promise<VendorDispatchRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("vendors").select("id, rating, service_offerings").order("rating", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as VendorDispatchRow[]) ?? [];
}

export async function expireStalePendingAssignments(timeoutSeconds: number): Promise<string[]> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - timeoutSeconds * 1000).toISOString();
  const { data: stale, error: selErr } = await supabase
    .from("service_request_assignments")
    .select("id, request_id")
    .eq("response", "pending")
    .lt("assigned_at", cutoff);
  if (selErr) throw new Error(selErr.message);
  const rows = stale ?? [];
  const requestIds = new Set<string>();
  for (const row of rows) {
    const { error } = await supabase
      .from("service_request_assignments")
      .update({ response: "expired", responded_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    requestIds.add(row.request_id as string);
  }
  return [...requestIds];
}

export async function getActiveFulfillmentRequestForVendor(vendorId: string): Promise<BuyerServiceRequestFullRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_service_requests")
    .select("*")
    .eq("provider_id", vendorId)
    .in("status", ["matched", "in_progress"])
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BuyerServiceRequestFullRow) ?? null;
}

/** Provider ids that already have a matched or in_progress job (cannot take another until completed or buyer cancels). */
export async function listProviderIdsWithActiveFulfillment(): Promise<Set<string>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_service_requests")
    .select("provider_id")
    .in("status", ["matched", "in_progress"])
    .not("provider_id", "is", null);
  if (error) throw new Error(error.message);
  const ids = new Set<string>();
  for (const row of data ?? []) {
    const pid = row.provider_id as string | null;
    if (pid) ids.add(pid);
  }
  return ids;
}

export async function getPendingAssignmentForVendor(vendorId: string): Promise<
  (ServiceRequestAssignmentRow & { request: BuyerServiceRequestFullRow }) | null
> {
  const active = await getActiveFulfillmentRequestForVendor(vendorId);
  if (active) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_request_assignments")
    .select("*")
    .eq("provider_id", vendorId)
    .eq("response", "pending")
    .order("assigned_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const assignment = data as ServiceRequestAssignmentRow;
  const request = await getBuyerServiceRequestFullRow(assignment.request_id);
  if (!request) return null;
  return { ...assignment, request };
}
