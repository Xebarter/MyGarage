export const VEHICLE_STATUSES = [
  'in_service',
  'awaiting_parts',
  'ready_for_pickup',
  'no_active_issues',
] as const;

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  in_service: 'In service',
  awaiting_parts: 'Awaiting parts',
  ready_for_pickup: 'Ready for pickup',
  no_active_issues: 'No active issues',
};

export const SERVICE_HISTORY_TYPES = [
  'repair',
  'maintenance',
  'diagnostic',
  'inspection',
  'other',
] as const;

export type ServiceHistoryType = (typeof SERVICE_HISTORY_TYPES)[number];

export const SERVICE_HISTORY_TYPE_LABELS: Record<ServiceHistoryType, string> = {
  repair: 'Repair',
  maintenance: 'Maintenance',
  diagnostic: 'Diagnostic',
  inspection: 'Inspection',
  other: 'Other',
};

export const SERVICE_HISTORY_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type ServiceHistoryStatus = (typeof SERVICE_HISTORY_STATUSES)[number];

export const SERVICE_HISTORY_STATUS_LABELS: Record<ServiceHistoryStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const VEHICLE_FUEL_TYPES = ['petrol', 'diesel', 'hybrid', 'electric', 'other'] as const;
export type VehicleFuelType = (typeof VEHICLE_FUEL_TYPES)[number];

export const VEHICLE_FUEL_TYPE_LABELS: Record<VehicleFuelType, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  hybrid: 'Hybrid',
  electric: 'Electric',
  other: 'Other',
};

export const VEHICLE_TRANSMISSIONS = ['manual', 'automatic', 'other'] as const;
export type VehicleTransmission = (typeof VEHICLE_TRANSMISSIONS)[number];

export const VEHICLE_TRANSMISSION_LABELS: Record<VehicleTransmission, string> = {
  manual: 'Manual',
  automatic: 'Automatic',
  other: 'Other',
};

export function isVehicleFuelType(value: string): value is VehicleFuelType {
  return (VEHICLE_FUEL_TYPES as readonly string[]).includes(value);
}

export function isVehicleTransmission(value: string): value is VehicleTransmission {
  return (VEHICLE_TRANSMISSIONS as readonly string[]).includes(value);
}

export const VEHICLE_DRIVE_TYPES = ['fwd', 'rwd', 'awd', '4wd'] as const;
export type VehicleDriveType = (typeof VEHICLE_DRIVE_TYPES)[number];

export const VEHICLE_DRIVE_TYPE_LABELS: Record<VehicleDriveType, string> = {
  fwd: 'Front-wheel drive',
  rwd: 'Rear-wheel drive',
  awd: 'All-wheel drive',
  '4wd': 'Four-wheel drive',
};

export const VEHICLE_BODY_TYPES = ['sedan', 'hatch', 'suv', 'pickup', 'van', 'other'] as const;
export type VehicleBodyType = (typeof VEHICLE_BODY_TYPES)[number];

export const VEHICLE_BODY_TYPE_LABELS: Record<VehicleBodyType, string> = {
  sedan: 'Sedan',
  hatch: 'Hatchback',
  suv: 'SUV',
  pickup: 'Pickup',
  van: 'Van',
  other: 'Other',
};

export function isVehicleDriveType(value: string): value is VehicleDriveType {
  return (VEHICLE_DRIVE_TYPES as readonly string[]).includes(value);
}

export function isVehicleBodyType(value: string): value is VehicleBodyType {
  return (VEHICLE_BODY_TYPES as readonly string[]).includes(value);
}

export type VehicleSpecFields = {
  trim: string | null;
  engine: string | null;
  driveType: VehicleDriveType | null;
  bodyType: VehicleBodyType | null;
  tyreSize: string | null;
};

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Parse optional concierge identity fields from a vehicle create/update body. */
export function vehicleSpecUpdatesFromBody(body: Record<string, unknown>): Partial<VehicleSpecFields> {
  const updates: Partial<VehicleSpecFields> = {};
  const trim = body.trim !== undefined ? optionalText(body.trim) : undefined;
  if (trim) updates.trim = trim;
  const engine = body.engine !== undefined ? optionalText(body.engine) : undefined;
  if (engine) updates.engine = engine;
  const driveRaw =
    body.driveType !== undefined || body.drive_type !== undefined
      ? String(body.driveType ?? body.drive_type ?? '')
          .trim()
          .toLowerCase()
      : undefined;
  if (driveRaw && isVehicleDriveType(driveRaw)) updates.driveType = driveRaw;
  const bodyRaw =
    body.bodyType !== undefined || body.body_type !== undefined
      ? String(body.bodyType ?? body.body_type ?? '')
          .trim()
          .toLowerCase()
      : undefined;
  if (bodyRaw && isVehicleBodyType(bodyRaw)) updates.bodyType = bodyRaw;
  const tyreSize =
    body.tyreSize !== undefined || body.tyre_size !== undefined
      ? optionalText(body.tyreSize ?? body.tyre_size)
      : undefined;
  if (tyreSize) updates.tyreSize = tyreSize;
  return updates;
}

/** Infer service history type from a service request category/service label. */
export function inferServiceHistoryType(category: string, service: string): ServiceHistoryType {
  const haystack = `${category} ${service}`.toLowerCase();
  if (/inspect|mot|emission|safety check/.test(haystack)) return 'inspection';
  if (/diagnos|scan|check engine|trouble code/.test(haystack)) return 'diagnostic';
  if (/oil|service|tune|filter|fluid|maintenance|wash|detail/.test(haystack)) return 'maintenance';
  if (/repair|fix|replace|brake|battery|tire|tyre|engine|transmission|ac |a\/c/.test(haystack)) return 'repair';
  return 'other';
}
