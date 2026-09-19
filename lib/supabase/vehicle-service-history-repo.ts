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
  findings: string;
  recommendations: string;
  partsUsed: string;
  odometerKm: number | null;
  photoUrls: string[];
  laborHours: number | null;
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
  findings: string | null;
  recommendations: string | null;
  parts_used: string | null;
  odometer_km: number | null;
  photo_urls: unknown;
  labor_hours: number | string | null;
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

function parsePhotoUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsePhotoUrls(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

function rowToVehicleServiceHistory(row: VehicleServiceHistoryRow): VehicleServiceHistoryEntry {
  const labor =
    row.labor_hours == null || row.labor_hours === ""
      ? null
      : Number(row.labor_hours);
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
    notes: row.notes ?? "",
    findings: row.findings ?? "",
    recommendations: row.recommendations ?? "",
    partsUsed: row.parts_used ?? "",
    odometerKm: row.odometer_km ?? null,
    photoUrls: parsePhotoUrls(row.photo_urls),
    laborHours: labor != null && Number.isFinite(labor) ? labor : null,
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

export function serializeVehicleServiceHistory(entry: VehicleServiceHistoryEntry) {
  return {
    ...entry,
    serviceDate: entry.serviceDate.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
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

export async function listLatestServiceHistoryByVehicleIds(
  vehicleIds: string[],
): Promise<Record<string, VehicleServiceHistoryEntry>> {
  const ids = [...new Set(vehicleIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return {};
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vehicle_service_history")
    .select("*")
    .in("vehicle_id", ids)
    .order("service_date", { ascending: false });
  if (error) {
    throw new Error(`Supabase list latest vehicle service history failed: ${error.message}`);
  }
  const latest: Record<string, VehicleServiceHistoryEntry> = {};
  for (const row of (data as VehicleServiceHistoryRow[] | null) ?? []) {
    const entry = rowToVehicleServiceHistory(row);
    if (!latest[entry.vehicleId]) latest[entry.vehicleId] = entry;
  }
  return latest;
}

export async function listVehicleServiceHistoryByRequestIds(
  requestIds: string[],
): Promise<Record<string, VehicleServiceHistoryEntry>> {
  const ids = [...new Set(requestIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return {};
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vehicle_service_history")
    .select("*")
    .in("service_request_id", ids);
  if (error) {
    throw new Error(`Supabase list service history by request ids failed: ${error.message}`);
  }
  const byRequest: Record<string, VehicleServiceHistoryEntry> = {};
  for (const row of (data as VehicleServiceHistoryRow[] | null) ?? []) {
    const entry = rowToVehicleServiceHistory(row);
    if (entry.serviceRequestId) byRequest[entry.serviceRequestId] = entry;
  }
  return byRequest;
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

function toInsertRow(entry: VehicleServiceHistoryInsert, id: string) {
  return {
    id,
    vehicle_id: entry.vehicleId,
    customer_id: entry.customerId,
    service_request_id: entry.serviceRequestId,
    service_type: entry.serviceType,
    service_name: entry.serviceName.trim(),
    service_date: entry.serviceDate.toISOString(),
    provider_id: entry.providerId,
    provider_name: entry.providerName.trim() || "MyGarage Provider",
    notes: (entry.notes ?? "").trim(),
    findings: (entry.findings ?? "").trim(),
    recommendations: (entry.recommendations ?? "").trim(),
    parts_used: (entry.partsUsed ?? "").trim(),
    odometer_km: entry.odometerKm ?? null,
    photo_urls: entry.photoUrls ?? [],
    labor_hours: entry.laborHours ?? null,
    status: entry.status,
  };
}

export async function insertVehicleServiceHistory(
  entry: VehicleServiceHistoryInsert,
): Promise<VehicleServiceHistoryEntry> {
  const supabase = createAdminClient();
  const id = entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await supabase
    .from("vehicle_service_history")
    .insert(toInsertRow(entry, id))
    .select("*")
    .single();
  if (error) {
    throw new Error(`Supabase insert vehicle service history failed: ${error.message}`);
  }
  return rowToVehicleServiceHistory(data as VehicleServiceHistoryRow);
}

export type VehicleServiceHistoryPatch = Partial<
  Pick<
    VehicleServiceHistoryEntry,
    | "notes"
    | "findings"
    | "recommendations"
    | "partsUsed"
    | "odometerKm"
    | "photoUrls"
    | "laborHours"
    | "status"
    | "serviceDate"
  >
>;

export async function updateVehicleServiceHistoryById(
  id: string,
  updates: VehicleServiceHistoryPatch,
): Promise<VehicleServiceHistoryEntry | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (updates.notes !== undefined) patch.notes = updates.notes.trim();
  if (updates.findings !== undefined) patch.findings = updates.findings.trim();
  if (updates.recommendations !== undefined) patch.recommendations = updates.recommendations.trim();
  if (updates.partsUsed !== undefined) patch.parts_used = updates.partsUsed.trim();
  if (updates.odometerKm !== undefined) patch.odometer_km = updates.odometerKm;
  if (updates.photoUrls !== undefined) patch.photo_urls = updates.photoUrls;
  if (updates.laborHours !== undefined) patch.labor_hours = updates.laborHours;
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
