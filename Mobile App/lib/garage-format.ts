import type { BuyerVehicle } from '@/types';

export function vehicleTitle(vehicle: Pick<BuyerVehicle, 'nickname' | 'year' | 'make' | 'model'>): string {
  if (vehicle.nickname?.trim()) return vehicle.nickname.trim();
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim();
}

export function vehicleSubtitle(vehicle: Pick<BuyerVehicle, 'make' | 'model' | 'licensePlate' | 'year'>): string {
  const parts = [`${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim()];
  if (vehicle.licensePlate?.trim()) parts.push(vehicle.licensePlate.trim());
  return parts.join(' · ');
}

export function formatGarageDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isServiceDueSoon(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const days = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 30;
}

export function isServiceOverdue(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

export function statusTone(
  status: BuyerVehicle['vehicleStatus'],
): 'neutral' | 'active' | 'warning' | 'success' {
  switch (status) {
    case 'in_service':
    case 'awaiting_parts':
      return 'active';
    case 'ready_for_pickup':
      return 'success';
    default:
      return 'neutral';
  }
}
