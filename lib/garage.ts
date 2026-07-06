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

/** Infer service history type from a service request category/service label. */
export function inferServiceHistoryType(category: string, service: string): ServiceHistoryType {
  const haystack = `${category} ${service}`.toLowerCase();
  if (/inspect|mot|emission|safety check/.test(haystack)) return 'inspection';
  if (/diagnos|scan|check engine|trouble code/.test(haystack)) return 'diagnostic';
  if (/oil|service|tune|filter|fluid|maintenance|wash|detail/.test(haystack)) return 'maintenance';
  if (/repair|fix|replace|brake|battery|tire|tyre|engine|transmission|ac |a\/c/.test(haystack)) return 'repair';
  return 'other';
}
