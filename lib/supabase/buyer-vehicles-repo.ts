import { createAdminClient } from "@/lib/supabase/admin";
import type { VehicleBodyType, VehicleDriveType, VehicleFuelType, VehicleStatus, VehicleTransmission } from "@/lib/garage";

export interface BuyerVehicle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string | null;
  imageUrl: string | null;
  nickname: string | null;
  isPrimary: boolean;
  vin: string | null;
  color: string | null;
  mileageKm: number | null;
  fuelType: VehicleFuelType | null;
  transmission: VehicleTransmission | null;
  trim: string | null;
  engine: string | null;
  driveType: VehicleDriveType | null;
  bodyType: VehicleBodyType | null;
  tyreSize: string | null;
  vehicleStatus: VehicleStatus;
  nextServiceDate: Date | null;
  statusUpdatedByProviderId: string | null;
  statusUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type BuyerVehicleRow = {
  id: string;
  customer_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string | null;
  image_url: string | null;
  nickname: string | null;
  is_primary: boolean;
  vin: string | null;
  color: string | null;
  mileage_km: number | null;
  fuel_type: VehicleFuelType | null;
  transmission: VehicleTransmission | null;
  trim: string | null;
  engine: string | null;
  drive_type: VehicleDriveType | null;
  body_type: VehicleBodyType | null;
  tyre_size: string | null;
  vehicle_status: VehicleStatus;
  next_service_date: string | null;
  status_updated_by_provider_id: string | null;
  status_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BuyerVehicleInsert = Omit<
  BuyerVehicle,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "vehicleStatus"
  | "nextServiceDate"
  | "statusUpdatedByProviderId"
  | "statusUpdatedAt"
  | "vin"
  | "color"
  | "mileageKm"
  | "fuelType"
  | "transmission"
  | "trim"
  | "engine"
  | "driveType"
  | "bodyType"
  | "tyreSize"
> & {
  id?: string;
  vehicleStatus?: VehicleStatus;
  vin?: string | null;
  color?: string | null;
  mileageKm?: number | null;
  fuelType?: VehicleFuelType | null;
  transmission?: VehicleTransmission | null;
  trim?: string | null;
  engine?: string | null;
  driveType?: VehicleDriveType | null;
  bodyType?: VehicleBodyType | null;
  tyreSize?: string | null;
};

export type BuyerVehicleProviderUpdate = {
  vehicleStatus: VehicleStatus;
  nextServiceDate?: Date | null;
  statusUpdatedByProviderId: string;
};

function rowToBuyerVehicle(row: BuyerVehicleRow): BuyerVehicle {
  return {
    id: row.id,
    customerId: row.customer_id,
    make: row.make,
    model: row.model,
    year: row.year,
    licensePlate: row.license_plate,
    imageUrl: row.image_url,
    nickname: row.nickname,
    isPrimary: row.is_primary,
    vin: row.vin ?? null,
    color: row.color ?? null,
    mileageKm: row.mileage_km ?? null,
    fuelType: row.fuel_type ?? null,
    transmission: row.transmission ?? null,
    trim: row.trim ?? null,
    engine: row.engine ?? null,
    driveType: row.drive_type ?? null,
    bodyType: row.body_type ?? null,
    tyreSize: row.tyre_size ?? null,
    vehicleStatus: row.vehicle_status,
    nextServiceDate: row.next_service_date ? new Date(row.next_service_date) : null,
    statusUpdatedByProviderId: row.status_updated_by_provider_id,
    statusUpdatedAt: row.status_updated_at ? new Date(row.status_updated_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function listBuyerVehicles(customerId: string): Promise<BuyerVehicle[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_vehicles")
    .select("*")
    .eq("customer_id", customerId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Supabase list buyer vehicles failed: ${error.message}`);
  }

  return (data as BuyerVehicleRow[] | null)?.map(rowToBuyerVehicle) ?? [];
}

export async function getBuyerVehicleById(id: string): Promise<BuyerVehicle | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("buyer_vehicles").select("*").eq("id", id).maybeSingle();
  if (error) {
    throw new Error(`Supabase get buyer vehicle failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToBuyerVehicle(data as BuyerVehicleRow);
}

export async function insertBuyerVehicle(vehicle: BuyerVehicleInsert): Promise<BuyerVehicle> {
  const supabase = createAdminClient();
  const id = vehicle.id ?? Date.now().toString();

  if (vehicle.isPrimary) {
    await supabase.from("buyer_vehicles").update({ is_primary: false }).eq("customer_id", vehicle.customerId);
  }

  const row: Record<string, unknown> = {
    id,
    customer_id: vehicle.customerId,
    make: vehicle.make.trim(),
    model: vehicle.model.trim(),
    year: vehicle.year,
    license_plate: vehicle.licensePlate?.trim() || null,
    image_url: vehicle.imageUrl?.trim() || null,
    nickname: vehicle.nickname?.trim() || null,
    is_primary: vehicle.isPrimary,
    vin: vehicle.vin?.trim() || null,
    color: vehicle.color?.trim() || null,
    mileage_km: vehicle.mileageKm ?? null,
    fuel_type: vehicle.fuelType ?? null,
    transmission: vehicle.transmission ?? null,
    vehicle_status: vehicle.vehicleStatus ?? "no_active_issues",
  };
  if (vehicle.trim !== undefined) row.trim = vehicle.trim ?? null;
  if (vehicle.engine !== undefined) row.engine = vehicle.engine ?? null;
  if (vehicle.driveType !== undefined) row.drive_type = vehicle.driveType ?? null;
  if (vehicle.bodyType !== undefined) row.body_type = vehicle.bodyType ?? null;
  if (vehicle.tyreSize !== undefined) row.tyre_size = vehicle.tyreSize ?? null;

  const { data, error } = await supabase.from("buyer_vehicles").insert(row).select("*").single();
  if (error) {
    throw new Error(`Supabase insert buyer vehicle failed: ${error.message}`);
  }
  return rowToBuyerVehicle(data as BuyerVehicleRow);
}

export async function updateBuyerVehicleById(id: string, updates: Partial<BuyerVehicle>): Promise<BuyerVehicle | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};

  if (updates.make !== undefined) patch.make = updates.make.trim();
  if (updates.model !== undefined) patch.model = updates.model.trim();
  if (updates.year !== undefined) patch.year = updates.year;
  if (updates.licensePlate !== undefined) patch.license_plate = updates.licensePlate?.trim() || null;
  if (updates.imageUrl !== undefined) patch.image_url = updates.imageUrl?.trim() || null;
  if (updates.nickname !== undefined) patch.nickname = updates.nickname?.trim() || null;
  if (updates.isPrimary !== undefined) patch.is_primary = updates.isPrimary;
  if (updates.vin !== undefined) patch.vin = updates.vin?.trim() || null;
  if (updates.color !== undefined) patch.color = updates.color?.trim() || null;
  if (updates.mileageKm !== undefined) patch.mileage_km = updates.mileageKm;
  if (updates.fuelType !== undefined) patch.fuel_type = updates.fuelType;
  if (updates.transmission !== undefined) patch.transmission = updates.transmission;
  if (updates.trim !== undefined) patch.trim = updates.trim?.trim() || null;
  if (updates.engine !== undefined) patch.engine = updates.engine?.trim() || null;
  if (updates.driveType !== undefined) patch.drive_type = updates.driveType;
  if (updates.bodyType !== undefined) patch.body_type = updates.bodyType;
  if (updates.tyreSize !== undefined) patch.tyre_size = updates.tyreSize?.trim() || null;

  if (updates.isPrimary === true && updates.customerId) {
    await supabase.from("buyer_vehicles").update({ is_primary: false }).eq("customer_id", updates.customerId);
  }

  if (Object.keys(patch).length === 0) return getBuyerVehicleById(id);

  const { data, error } = await supabase
    .from("buyer_vehicles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase update buyer vehicle failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToBuyerVehicle(data as BuyerVehicleRow);
}

export async function updateBuyerVehicleStatusByProvider(
  id: string,
  update: BuyerVehicleProviderUpdate,
): Promise<BuyerVehicle | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    vehicle_status: update.vehicleStatus,
    status_updated_by_provider_id: update.statusUpdatedByProviderId,
    status_updated_at: now,
  };
  if (update.nextServiceDate !== undefined) {
    patch.next_service_date = update.nextServiceDate ? update.nextServiceDate.toISOString() : null;
  }

  const { data, error } = await supabase
    .from("buyer_vehicles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    throw new Error(`Supabase update vehicle status by provider failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToBuyerVehicle(data as BuyerVehicleRow);
}

/** Keep garage mileage current from a completed job odometer, never rolling it backward. */
export async function bumpBuyerVehicleMileageIfHigher(id: string, odometerKm: number): Promise<BuyerVehicle | null> {
  const vehicle = await getBuyerVehicleById(id);
  if (!vehicle) return null;
  if (!Number.isFinite(odometerKm) || odometerKm < 0) return vehicle;
  const next = Math.round(odometerKm);
  if (vehicle.mileageKm != null && next <= vehicle.mileageKm) return vehicle;
  return updateBuyerVehicleById(id, { mileageKm: next });
}

export async function deleteBuyerVehicleById(id: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("buyer_vehicles").delete().eq("id", id).select("id");
  if (error) {
    throw new Error(`Supabase delete buyer vehicle failed: ${error.message}`);
  }
  return Boolean(data && data.length > 0);
}
