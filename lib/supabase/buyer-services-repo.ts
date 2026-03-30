import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveFulfillmentRequestForVendor } from "@/lib/supabase/service-dispatch-repo";

export interface BuyerServiceRequest {
  id: string;
  customerId: string;
  category: string;
  service: string;
  location: string;
  status: "pending" | "matched" | "in_progress" | "completed" | "cancelled";
  providerId: string | null;
  acceptedAt: Date | null;
  arrivedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  buyerContactPhone: string;
  buyerContactName: string;
  destinationLat: number | null;
  destinationLng: number | null;
  providerLat: number | null;
  providerLng: number | null;
  providerLocationUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BuyerProviderRating {
  id: string;
  customerId: string;
  providerId: string;
  stars: number;
  createdAt: Date;
  updatedAt: Date;
}

type BuyerServiceRequestRow = {
  id: string;
  customer_id: string;
  category: string;
  service: string;
  location: string;
  status: "pending" | "matched" | "in_progress" | "completed" | "cancelled";
  provider_id: string | null;
  accepted_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  buyer_contact_phone: string | null;
  buyer_contact_name: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  provider_lat: number | null;
  provider_lng: number | null;
  provider_location_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

type BuyerProviderRatingRow = {
  id: string;
  customer_id: string;
  provider_id: string;
  stars: number;
  created_at: string;
  updated_at: string;
};

export type BuyerServiceRequestInsert = Omit<
  BuyerServiceRequest,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "status"
  | "providerId"
  | "acceptedAt"
  | "arrivedAt"
  | "startedAt"
  | "completedAt"
  | "buyerContactPhone"
  | "buyerContactName"
  | "destinationLat"
  | "destinationLng"
  | "providerLat"
  | "providerLng"
  | "providerLocationUpdatedAt"
> & {
  id?: string;
  status?: BuyerServiceRequest["status"];
  buyerContactPhone: string;
  buyerContactName: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
};

export type BuyerProviderRatingUpsert = Omit<BuyerProviderRating, "id" | "createdAt" | "updatedAt"> & { id?: string };

function rowToBuyerServiceRequest(row: BuyerServiceRequestRow): BuyerServiceRequest {
  return {
    id: row.id,
    customerId: row.customer_id,
    category: row.category,
    service: row.service,
    location: row.location,
    status: row.status,
    providerId: row.provider_id ?? null,
    acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
    arrivedAt: row.arrived_at ? new Date(row.arrived_at) : null,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    buyerContactPhone: row.buyer_contact_phone ?? "",
    buyerContactName: row.buyer_contact_name ?? "",
    destinationLat: row.destination_lat ?? null,
    destinationLng: row.destination_lng ?? null,
    providerLat: row.provider_lat ?? null,
    providerLng: row.provider_lng ?? null,
    providerLocationUpdatedAt: row.provider_location_updated_at ? new Date(row.provider_location_updated_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rowToBuyerProviderRating(row: BuyerProviderRatingRow): BuyerProviderRating {
  return {
    id: row.id,
    customerId: row.customer_id,
    providerId: row.provider_id,
    stars: row.stars,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function listBuyerServiceRequests(customerId: string): Promise<BuyerServiceRequest[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_service_requests")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Supabase list buyer service requests failed: ${error.message}`);
  }
  return (data as BuyerServiceRequestRow[] | null)?.map(rowToBuyerServiceRequest) ?? [];
}

export async function listAllBuyerServiceRequests(): Promise<BuyerServiceRequest[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_service_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Supabase list all buyer service requests failed: ${error.message}`);
  }
  return (data as BuyerServiceRequestRow[] | null)?.map(rowToBuyerServiceRequest) ?? [];
}

export async function insertBuyerServiceRequest(request: BuyerServiceRequestInsert): Promise<BuyerServiceRequest> {
  const supabase = createAdminClient();
  const id = request.id ?? Date.now().toString();
  const row: Record<string, unknown> = {
    id,
    customer_id: request.customerId,
    category: request.category,
    service: request.service,
    location: request.location,
    status: request.status ?? "pending",
    buyer_contact_phone: request.buyerContactPhone,
    buyer_contact_name: request.buyerContactName,
  };
  if (request.destinationLat != null && request.destinationLng != null) {
    row.destination_lat = request.destinationLat;
    row.destination_lng = request.destinationLng;
  }
  const { data, error } = await supabase.from("buyer_service_requests").insert(row).select("*").single();
  if (error) {
    throw new Error(`Supabase insert buyer service request failed: ${error.message}`);
  }
  return rowToBuyerServiceRequest(data as BuyerServiceRequestRow);
}

export async function getBuyerServiceRequestByIdForCustomer(
  id: string,
  customerId: string,
): Promise<BuyerServiceRequest | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_service_requests")
    .select("*")
    .eq("id", id)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase get buyer service request failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToBuyerServiceRequest(data as BuyerServiceRequestRow);
}

export async function getBuyerServiceRequestById(id: string): Promise<BuyerServiceRequest | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("buyer_service_requests").select("*").eq("id", id).maybeSingle();
  if (error) {
    throw new Error(`Supabase get buyer service request by id failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToBuyerServiceRequest(data as BuyerServiceRequestRow);
}

export async function updateBuyerServiceRequestProviderLocation(
  id: string,
  lat: number,
  lng: number,
): Promise<BuyerServiceRequest | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("buyer_service_requests")
    .update({
      provider_lat: lat,
      provider_lng: lng,
      provider_location_updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase update provider location failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToBuyerServiceRequest(data as BuyerServiceRequestRow);
}

export async function updateBuyerServiceRequestDestinationCoords(
  id: string,
  lat: number,
  lng: number,
): Promise<BuyerServiceRequest | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_service_requests")
    .update({
      destination_lat: lat,
      destination_lng: lng,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase update destination coords failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToBuyerServiceRequest(data as BuyerServiceRequestRow);
}

export async function updateBuyerServiceRequestStatusById(
  id: string,
  status: BuyerServiceRequest["status"]
): Promise<BuyerServiceRequest | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_service_requests")
    .update({ status })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase update buyer service request status failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToBuyerServiceRequest(data as BuyerServiceRequestRow);
}

/** Sets status to matched and assigns provider (or re-affirms same provider). Returns null if another provider already owns the job. */
export async function vendorAcceptServiceRequest(id: string, providerId: string): Promise<BuyerServiceRequest | null> {
  const existing = await getBuyerServiceRequestById(id);
  if (!existing) return null;
  if (existing.providerId && existing.providerId !== providerId) return null;

  const busyElsewhere = await getActiveFulfillmentRequestForVendor(providerId);
  if (busyElsewhere != null && busyElsewhere.id !== id) return null;

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("buyer_service_requests")
    .update({
      status: "matched",
      provider_id: providerId,
      accepted_at: now,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase vendor accept service request failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToBuyerServiceRequest(data as BuyerServiceRequestRow);
}

/**
 * When a job has no provider_id yet (legacy or partial updates), bind the acting vendor so
 * in_progress / completed PATCH and dispatch stages can authorize correctly.
 */
export async function assignProviderToUnassignedServiceRequest(
  id: string,
  providerId: string,
): Promise<BuyerServiceRequest | null> {
  const existing = await getBuyerServiceRequestById(id);
  if (!existing) return null;
  if (existing.providerId != null) {
    return existing.providerId === providerId ? existing : null;
  }

  const busyElsewhere = await getActiveFulfillmentRequestForVendor(providerId);
  if (busyElsewhere != null && busyElsewhere.id !== id) return null;

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("buyer_service_requests")
    .update({
      provider_id: providerId,
      accepted_at: now,
    })
    .eq("id", id)
    .is("provider_id", null)
    .select("*")
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase assign provider to unassigned request failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToBuyerServiceRequest(data as BuyerServiceRequestRow);
}

export async function listBuyerProviderRatings(customerId: string): Promise<BuyerProviderRating[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_provider_ratings")
    .select("*")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });
  if (error) {
    throw new Error(`Supabase list buyer provider ratings failed: ${error.message}`);
  }
  return (data as BuyerProviderRatingRow[] | null)?.map(rowToBuyerProviderRating) ?? [];
}

export async function upsertBuyerProviderRating(rating: BuyerProviderRatingUpsert): Promise<BuyerProviderRating> {
  const supabase = createAdminClient();
  const id = rating.id ?? `${rating.customerId}-${rating.providerId}`;
  const row = {
    id,
    customer_id: rating.customerId,
    provider_id: rating.providerId,
    stars: rating.stars,
  };
  const { data, error } = await supabase
    .from("buyer_provider_ratings")
    .upsert(row, { onConflict: "customer_id,provider_id" })
    .select("*")
    .single();
  if (error) {
    throw new Error(`Supabase upsert buyer provider rating failed: ${error.message}`);
  }
  return rowToBuyerProviderRating(data as BuyerProviderRatingRow);
}
