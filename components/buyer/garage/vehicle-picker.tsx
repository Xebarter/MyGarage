'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { BuyerGarageVehicle } from './types';
import { GarageVehiclePhoto } from './vehicle-photo';
import { vehicleImageSrc, vehicleTitle } from './utils';

type Props = {
  customerId: string;
  value: string;
  onChange: (vehicleId: string) => void;
  className?: string;
};

export function GarageVehiclePicker({ customerId, value, onChange, className }: Props) {
  const [vehicles, setVehicles] = useState<BuyerGarageVehicle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId) {
      setVehicles([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/buyer/vehicles?customerId=${encodeURIComponent(customerId)}`)
      .then(async (res) => {
        if (!res.ok) return [];
        return (await res.json()) as BuyerGarageVehicle[];
      })
      .then((list) => {
        if (cancelled) return;
        const vehiclesList = Array.isArray(list) ? list : [];
        setVehicles(vehiclesList);
        if (!value && vehiclesList.length > 0) {
          const primary = vehiclesList.find((v) => v.isPrimary) ?? vehiclesList[0];
          onChange(primary.id);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Auto-select only on first load for this customer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  if (!customerId) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">Vehicle</p>
        <Link href="/buyer/garage" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          <Plus className="h-3.5 w-3.5" />
          Add vehicle
        </Link>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading your garage…</p>
      ) : vehicles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary/25 bg-primary/5 px-3 py-3 text-xs text-muted-foreground">
          Add a vehicle in My Garage so this job’s notes land on the right car.
        </p>
      ) : (
        <div className="grid gap-2">
          {vehicles.map((vehicle) => {
            const selected = value === vehicle.id;
            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => onChange(vehicle.id)}
                className={cn(
                  'flex min-h-[52px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                  selected
                    ? 'border-primary/40 bg-primary/10 ring-1 ring-primary/25'
                    : 'border-border/70 bg-card hover:border-primary/25',
                )}
              >
                <span className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <GarageVehiclePhoto src={vehicleImageSrc(vehicle)} alt="" iconClassName="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{vehicleTitle(vehicle)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {vehicle.licensePlate || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
