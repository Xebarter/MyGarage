'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Car, Plus, RefreshCw } from 'lucide-react';

import {
  BUYER_SURFACE,
  BuyerEmptyState,
  BuyerPageHeader,
  BuyerPageShell,
  BuyerPageSkeleton,
} from '@/components/buyer/buyer-page-chrome';
import { GarageVehicleCard } from '@/components/buyer/garage/vehicle-card';
import { GarageVehicleFormFields } from '@/components/buyer/garage/vehicle-form-fields';
import {
  EMPTY_GARAGE_VEHICLE_FORM,
  type BuyerGarageVehicle,
  type GarageVehicleForm,
} from '@/components/buyer/garage/types';
import { resolveBuyerCustomerId, vehicleFormPayload } from '@/components/buyer/garage/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function BuyerGarageHubPage() {
  const [customerId, setCustomerId] = useState('');
  const [vehicles, setVehicles] = useState<BuyerGarageVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GarageVehicleForm>(EMPTY_GARAGE_VEHICLE_FORM);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const id = await resolveBuyerCustomerId();
      setCustomerId(id);
      if (!id) {
        setVehicles([]);
        return;
      }
      const response = await fetch(`/api/buyer/vehicles?customerId=${encodeURIComponent(id)}`);
      if (!response.ok) {
        setVehicles([]);
        return;
      }
      const data = (await response.json()) as BuyerGarageVehicle[];
      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load garage:', error);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveVehicle = async () => {
    if (!customerId || !form.make.trim() || !form.model.trim()) return;
    try {
      setSaving(true);
      const response = await fetch('/api/buyer/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleFormPayload(customerId, form)),
      });
      if (!response.ok) return;
      setShowForm(false);
      setForm(EMPTY_GARAGE_VEHICLE_FORM);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BuyerPageShell>
      <BuyerPageHeader
        eyebrow="Vehicles"
        title="My Garage"
        description="Keep every car, service note, and document in one place. Book with a vehicle so provider notes land here."
        actions={
          <>
            <Button variant="outline" className="h-10 rounded-full" onClick={() => void load()} disabled={loading || saving}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              className="h-10 rounded-full"
              onClick={() => {
                setForm(EMPTY_GARAGE_VEHICLE_FORM);
                setShowForm(true);
              }}
              disabled={!customerId || saving}
            >
              <Plus className="h-4 w-4" />
              Add vehicle
            </Button>
          </>
        }
      />

      {!customerId && !loading ? (
        <Card className={BUYER_SURFACE}>
          <BuyerEmptyState
            icon={Car}
            title="Sign in to manage your garage"
            description="Your vehicles and provider service notes appear here after you sign in."
          >
            <Button asChild>
              <Link href="/auth?role=buyer&next=/buyer/garage">Sign in</Link>
            </Button>
          </BuyerEmptyState>
        </Card>
      ) : null}

      {showForm ? (
        <Card className={cn(BUYER_SURFACE, 'p-5 sm:p-6')}>
          <h2 className="text-base font-bold tracking-tight">Add a vehicle</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Photos and nicknames help you pick the right car when booking a service.
          </p>
          <div className="mt-5">
            <GarageVehicleFormFields form={form} onChange={setForm} disabled={saving} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button className="rounded-xl" onClick={() => void saveVehicle()} disabled={saving || !form.make.trim() || !form.model.trim()}>
              {saving ? 'Saving…' : 'Add vehicle'}
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      {customerId && loading ? <BuyerPageSkeleton tiles={0} rows={3} /> : null}

      {customerId && !loading && vehicles.length === 0 ? (
        <Card className={BUYER_SURFACE}>
          <BuyerEmptyState
            icon={Car}
            title="No vehicles yet"
            description="Add a vehicle so providers can attach job notes, photos, and a next-service date to the right car."
          >
            <Button onClick={() => setShowForm(true)}>Add your first vehicle</Button>
          </BuyerEmptyState>
        </Card>
      ) : null}

      {vehicles.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {vehicles.map((vehicle) => (
            <GarageVehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      ) : null}
    </BuyerPageShell>
  );
}
