import { createAdminClient } from "@/lib/supabase/admin";
import type { ServiceHistoryStatus, ServiceHistoryType } from "@/lib/garage";

export interface VehicleServiceHistoryEntry {
  id: string;
  vehicleId: string;
  customerId: string;
  serviceRequestId: string | null;
  serviceType: ServiceHistoryType;
  serviceName: string;
  serviceDate: Date;
  providerId: string | null;
  providerName: string;
  notes: string;
  status: ServiceHistoryStatus;
  createdAt: Date;
  updatedAt: Date;
}

type VehicleServiceHistoryRow = {
  id: string;
  vehicle_id: string;
  customer_id: string;
  service_request_id: string | null;
  service_type: ServiceHistoryType;
  service_name: string;
  service_date: string;
  provider_id: string | null;
  provider_name: string;
  notes: string;
  status: ServiceHistoryStatus;
  created_at: string;
  updated_at: string;
};

export type VehicleServiceHistoryInsert = Omit<
  VehicleServiceHistoryEntry,
  "id" | "createdAt" | "updatedAt"
> & { id?: string };

export type VehicleServiceHistoryFilters = {
  serviceType?: ServiceHistoryType;
  providerId?: string;
  status?: ServiceHistoryStatus;
  sortBy?: "date" | "serviceType" | "provider" | "status";
  sortOrder?: "asc" | "desc";
};

function rowToVehicleServiceHistory(row: VehicleServiceHistoryRow): VehicleServiceHistoryEntry {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    customerId: row.customer_id,
    serviceRequestId: row.service_request_id,
    serviceType: row.service_type,
    serviceName: row.service_name,
    serviceDate: new Date(row.service_date),
    providerId: row.provider_id,
    providerName: row.provider_name,
    notes: row.notes,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function sortColumn(sortBy: VehicleServiceHistoryFilters["sortBy"]): string {
  switch (sortBy) {
    case "serviceType":
      return "service_type";
    case "provider":
      return "provider_name";
    case "status":
      return "status";
    case "date":
    default:
      return "service_date";
  }
}

export async function listVehicleServiceHistory(
  vehicleId: string,
  filters: VehicleServiceHistoryFilters = {},
): Promise<VehicleServiceHistoryEntry[]> {
  const supabase = createAdminClient();
  let query = supabase.from("vehicle_service_history").select("*").eq("vehicle_id", vehicleId);

  if (filters.serviceType) query = query.eq("service_type", filters.serviceType);
  if (filters.providerId) query = query.eq("provider_id", filters.providerId);
  if (filters.status) query = query.eq("status", filters.status);

  const ascending = filters.sortOrder === "asc";
  query = query.order(sortColumn(filters.sortBy), { ascending });

  const { data, error } = await query;
  if (error) {
    throw new Error(`Supabase list vehicle service history failed: ${error.message}`);
  }

  return (data as VehicleServiceHistoryRow[] | null)?.map(rowToVehicleServiceHistory) ?? [];
}

export async function getVehicleServiceHistoryByRequestId(
  serviceRequestId: string,
): Promise<VehicleServiceHistoryEntry | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vehicle_service_history")
    .select("*")
    .eq("service_request_id", serviceRequestId)
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase get vehicle service history by request failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToVehicleServiceHistory(data as VehicleServiceHistoryRow);
}

export async function insertVehicleServiceHistory(
  entry: VehicleServiceHistoryInsert,
): Promise<VehicleServiceHistoryEntry> {
  const supabase = createAdminClient();
  const id = entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const row = {
    id,
    vehicle_id: entry.vehicleId,
    customer_id: entry.customerId,
    service_request_id: entry.serviceRequestId,
    service_type: entry.serviceType,
    service_name: entry.serviceName.trim(),
    service_date: entry.serviceDate.toISOString(),
    provider_id: entry.providerId,
    provider_name: entry.providerName.trim() || "MyGarage Provider",
    notes: entry.notes.trim(),
    status: entry.status,
  };

  const { data, error } = await supabase.from("vehicle_service_history").insert(row).select("*").single();
  if (error) {
    throw new Error(`Supabase insert vehicle service history failed: ${error.message}`);
  }
  return rowToVehicleServiceHistory(data as VehicleServiceHistoryRow);
}

export async function updateVehicleServiceHistoryById(
  id: string,
  updates: Partial<Pick<VehicleServiceHistoryEntry, "notes" | "status" | "serviceDate">>,
): Promise<VehicleServiceHistoryEntry | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (updates.notes !== undefined) patch.notes = updates.notes.trim();
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.serviceDate !== undefined) patch.service_date = updates.serviceDate.toISOString();

  if (Object.keys(patch).length === 0) return null;

  const { data, error } = await supabase
    .from("vehicle_service_history")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase update vehicle service history failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToVehicleServiceHistory(data as VehicleServiceHistoryRow);
}
