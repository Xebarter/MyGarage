import { createAdminClient } from "@/lib/supabase/admin";

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
> & {
  id?: string;
  status?: BuyerServiceRequest["status"];
  buyerContactPhone: string;
  buyerContactName: string;
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
  const row = {
    id,
    customer_id: request.customerId,
    category: request.category,
    service: request.service,
    location: request.location,
    status: request.status ?? "pending",
    buyer_contact_phone: request.buyerContactPhone,
    buyer_contact_name: request.buyerContactName,
  };
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
