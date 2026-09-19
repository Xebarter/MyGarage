import {
  isVehicleBodyType,
  isVehicleDriveType,
  isVehicleFuelType,
  isVehicleTransmission,
  type VehicleStatus,
} from '@/lib/garage';
import type { BuyerGarageVehicle, GarageVehicleForm } from './types';
import { EMPTY_GARAGE_VEHICLE_FORM } from './types';

export function vehicleImageSrc(value: string | null | undefined): string | null;
export function vehicleImageSrc(vehicle: { imageUrl?: string | null; image_url?: string | null }): string | null;
export function vehicleImageSrc(
  value: string | null | undefined | { imageUrl?: string | null; image_url?: string | null },
): string | null {
  const raw =
    typeof value === 'string' || value == null
      ? value
      : value.imageUrl ?? value.image_url;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function vehicleTitle(v: Pick<BuyerGarageVehicle, 'nickname' | 'year' | 'make' | 'model'>) {
  if (v.nickname?.trim()) return v.nickname.trim();
  return `${v.year} ${v.make} ${v.model}`.trim();
}

export function vehicleSubtitle(v: Pick<BuyerGarageVehicle, 'licensePlate' | 'year' | 'make' | 'model' | 'nickname'>) {
  const plate = v.licensePlate?.trim() || 'No plate';
  if (v.nickname?.trim()) return `${v.year} ${v.make} ${v.model} · ${plate}`;
  return plate;
}

export function formatGarageDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function statusBadgeClass(status: VehicleStatus): string {
  if (status === 'no_active_issues') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100';
  if (status === 'ready_for_pickup') return 'border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100';
  if (status === 'awaiting_parts') return 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100';
  return 'border-violet-500/30 bg-violet-500/10 text-violet-950 dark:text-violet-100';
}

export function formFromVehicle(vehicle: BuyerGarageVehicle): GarageVehicleForm {
  return {
    make: vehicle.make,
    model: vehicle.model,
    year: String(vehicle.year),
    licensePlate: vehicle.licensePlate ?? '',
    imageUrl: vehicleImageSrc(vehicle) ?? '',
    nickname: vehicle.nickname ?? '',
    isPrimary: vehicle.isPrimary,
    vin: vehicle.vin ?? '',
    color: vehicle.color ?? '',
    mileageKm: vehicle.mileageKm != null ? String(vehicle.mileageKm) : '',
    fuelType: vehicle.fuelType ?? '',
    transmission: vehicle.transmission ?? '',
    trim: vehicle.trim ?? '',
    engine: vehicle.engine ?? '',
    driveType: vehicle.driveType ?? '',
    bodyType: vehicle.bodyType ?? '',
    tyreSize: vehicle.tyreSize ?? '',
  };
}

export function vehicleFormPayload(customerId: string, form: GarageVehicleForm) {
  return {
    customerId,
    make: form.make.trim(),
    model: form.model.trim(),
    year: Number(form.year),
    licensePlate: form.licensePlate.trim() || null,
    imageUrl: form.imageUrl.trim() || null,
    nickname: form.nickname.trim() || null,
    isPrimary: form.isPrimary,
    vin: form.vin.trim() || null,
    color: form.color.trim() || null,
    mileageKm: form.mileageKm.trim() ? Number(form.mileageKm) : null,
    fuelType: isVehicleFuelType(form.fuelType) ? form.fuelType : null,
    transmission: isVehicleTransmission(form.transmission) ? form.transmission : null,
    trim: form.trim.trim() || null,
    engine: form.engine.trim() || null,
    driveType: isVehicleDriveType(form.driveType) ? form.driveType : null,
    bodyType: isVehicleBodyType(form.bodyType) ? form.bodyType : null,
    tyreSize: form.tyreSize.trim() || null,
  };
}

export { EMPTY_GARAGE_VEHICLE_FORM };

export async function resolveBuyerCustomerId(): Promise<string> {
  const localId = localStorage.getItem('currentBuyerId') || '';
  const email = (localStorage.getItem('currentBuyerEmail') || '').trim();
  if (localId) return localId;
  if (!email) return '';
  const customerRes = await fetch(`/api/customers?email=${encodeURIComponent(email)}`);
  if (!customerRes.ok) return '';
  const customer = (await customerRes.json()) as { id?: string } | null;
  if (!customer?.id) return '';
  localStorage.setItem('currentBuyerId', customer.id);
  return customer.id;
}
