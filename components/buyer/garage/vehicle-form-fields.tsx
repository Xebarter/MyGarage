'use client';

import { ListingImageField } from '@/components/listing-image-field';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  VEHICLE_BODY_TYPE_LABELS,
  VEHICLE_BODY_TYPES,
  VEHICLE_DRIVE_TYPE_LABELS,
  VEHICLE_DRIVE_TYPES,
  VEHICLE_FUEL_TYPE_LABELS,
  VEHICLE_FUEL_TYPES,
  VEHICLE_TRANSMISSION_LABELS,
  VEHICLE_TRANSMISSIONS,
} from '@/lib/garage';
import { uploadVehicleImage } from '@/lib/upload-vehicle-image';

import type { GarageVehicleForm } from './types';

type Props = {
  form: GarageVehicleForm;
  onChange: (next: GarageVehicleForm) => void;
  disabled?: boolean;
};

export function GarageVehicleFormFields({ form, onChange, disabled }: Props) {
  const set = (patch: Partial<GarageVehicleForm>) => onChange({ ...form, ...patch });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Make</Label>
        <Input className="h-11 rounded-xl" value={form.make} onChange={(e) => set({ make: e.target.value })} placeholder="Toyota" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Model</Label>
        <Input className="h-11 rounded-xl" value={form.model} onChange={(e) => set({ model: e.target.value })} placeholder="Corolla" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Year</Label>
        <Input className="h-11 rounded-xl" type="number" value={form.year} onChange={(e) => set({ year: e.target.value })} disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>License plate</Label>
        <Input className="h-11 rounded-xl" value={form.licensePlate} onChange={(e) => set({ licensePlate: e.target.value })} placeholder="UAB 123X" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Nickname</Label>
        <Input className="h-11 rounded-xl" value={form.nickname} onChange={(e) => set({ nickname: e.target.value })} placeholder="Family SUV" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Color</Label>
        <Input className="h-11 rounded-xl" value={form.color} onChange={(e) => set({ color: e.target.value })} placeholder="White" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>VIN</Label>
        <Input className="h-11 rounded-xl" value={form.vin} onChange={(e) => set({ vin: e.target.value })} placeholder="Optional" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Mileage (km)</Label>
        <Input className="h-11 rounded-xl" type="number" value={form.mileageKm} onChange={(e) => set({ mileageKm: e.target.value })} placeholder="45000" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Fuel</Label>
        <Select value={form.fuelType || 'none'} onValueChange={(v) => set({ fuelType: v === 'none' ? '' : v })} disabled={disabled}>
          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not set</SelectItem>
            {VEHICLE_FUEL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{VEHICLE_FUEL_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Transmission</Label>
        <Select value={form.transmission || 'none'} onValueChange={(v) => set({ transmission: v === 'none' ? '' : v })} disabled={disabled}>
          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not set</SelectItem>
            {VEHICLE_TRANSMISSIONS.map((t) => (
              <SelectItem key={t} value={t}>{VEHICLE_TRANSMISSION_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Trim</Label>
        <Input className="h-11 rounded-xl" value={form.trim} onChange={(e) => set({ trim: e.target.value })} placeholder="TXL, XLi" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Engine</Label>
        <Input className="h-11 rounded-xl" value={form.engine} onChange={(e) => set({ engine: e.target.value })} placeholder="1.8L 2ZR-FE" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Drivetrain</Label>
        <Select value={form.driveType || 'none'} onValueChange={(v) => set({ driveType: v === 'none' ? '' : v })} disabled={disabled}>
          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not set</SelectItem>
            {VEHICLE_DRIVE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{VEHICLE_DRIVE_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Body type</Label>
        <Select value={form.bodyType || 'none'} onValueChange={(v) => set({ bodyType: v === 'none' ? '' : v })} disabled={disabled}>
          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not set</SelectItem>
            {VEHICLE_BODY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{VEHICLE_BODY_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tyre size</Label>
        <Input className="h-11 rounded-xl" value={form.tyreSize} onChange={(e) => set({ tyreSize: e.target.value })} placeholder="205/55R16" disabled={disabled} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Photo</Label>
        <ListingImageField
          mode="service"
          value={form.imageUrl}
          onChange={(imageUrl) => set({ imageUrl })}
          uploadFn={uploadVehicleImage}
          disabled={disabled}
        />
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <Checkbox
          checked={form.isPrimary}
          onCheckedChange={(checked) => set({ isPrimary: checked === true })}
          disabled={disabled}
        />
        Set as primary vehicle
      </label>
    </div>
  );
}
