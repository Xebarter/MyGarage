'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Filter, Pencil, RefreshCw, Trash2, Wrench } from 'lucide-react';

import {
  BUYER_SURFACE,
  BuyerEmptyState,
  BuyerPageHeader,
  BuyerPageShell,
} from '@/components/buyer/buyer-page-chrome';
import { ServiceLogCard } from '@/components/buyer/garage/service-log-card';
import { GarageVehicleFormFields } from '@/components/buyer/garage/vehicle-form-fields';
import { VehicleDocumentsPanel } from '@/components/buyer/garage/vehicle-documents-panel';
import { VehicleStatusStrip } from '@/components/buyer/garage/vehicle-status-strip';
import {
  EMPTY_GARAGE_VEHICLE_FORM,
  type BuyerGarageVehicle,
  type GarageServiceHistoryEntry,
  type GarageVehicleForm,
} from '@/components/buyer/garage/types';
import { GarageVehiclePhoto } from '@/components/buyer/garage/vehicle-photo';
import { formFromVehicle, resolveBuyerCustomerId, vehicleFormPayload, vehicleImageSrc, vehicleTitle } from '@/components/buyer/garage/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SERVICE_HISTORY_TYPE_LABELS,
  SERVICE_HISTORY_TYPES,
  VEHICLE_BODY_TYPE_LABELS,
  VEHICLE_DRIVE_TYPE_LABELS,
  VEHICLE_FUEL_TYPE_LABELS,
  VEHICLE_TRANSMISSION_LABELS,
} from '@/lib/garage';
import { cn } from '@/lib/utils';
import { openConciergeChat } from '@/lib/concierge/open';

const POLL_MS = 15_000;

export default function BuyerGarageVehiclePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const vehicleId = params?.id ? decodeURIComponent(params.id) : '';

  const [customerId, setCustomerId] = useState('');
  const [vehicle, setVehicle] = useState<BuyerGarageVehicle | null>(null);
  const [history, setHistory] = useState<GarageServiceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<GarageVehicleForm>(EMPTY_GARAGE_VEHICLE_FORM);
  const [filterType, setFilterType] = useState('all');
  const [filterProvider, setFilterProvider] = useState('all');

  const providerOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const entry of history) {
      if (entry.providerId) names.set(entry.providerId, entry.providerName);
    }
    return Array.from(names.entries()).map(([id, name]) => ({ id, name }));
  }, [history]);

  const load = useCallback(async () => {
    if (!vehicleId) return;
    try {
      const id = await resolveBuyerCustomerId();
      setCustomerId(id);
      const paramsQs = new URLSearchParams();
      paramsQs.set('sortBy', 'date');
      paramsQs.set('sortOrder', 'desc');
      if (filterType !== 'all') paramsQs.set('serviceType', filterType);
      if (filterProvider !== 'all') paramsQs.set('providerId', filterProvider);
      const response = await fetch(`/api/buyer/vehicles/${encodeURIComponent(vehicleId)}/service-history?${paramsQs.toString()}`);
      if (!response.ok) {
        setVehicle(null);
        setHistory([]);
        return;
      }
      const payload = await response.json();
      setVehicle(payload.vehicle ?? null);
      setHistory(Array.isArray(payload.history) ? payload.history : []);
    } catch (error) {
      console.error('Failed to load vehicle garage:', error);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, filterType, filterProvider]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const saveVehicle = async () => {
    if (!customerId || !vehicle || !form.make.trim() || !form.model.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/buyer/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleFormPayload(customerId, form)),
      });
      if (!response.ok) return;
      const updated = await response.json();
      setVehicle((prev) => (prev ? { ...prev, ...updated } : updated));
      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = async () => {
    if (!vehicle || !window.confirm('Remove this vehicle from your garage?')) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/buyer/vehicles/${vehicle.id}`, { method: 'DELETE' });
      if (!response.ok) return;
      router.push('/buyer/garage');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BuyerPageShell>
      <div>
        <Link href="/buyer/garage" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          All vehicles
        </Link>
      </div>

      {!loading && !vehicle ? (
        <Card className={BUYER_SURFACE}>
          <BuyerEmptyState icon={Car} title="Vehicle not found" description="It may have been removed, or you need to sign in again.">
            <Button asChild>
              <Link href="/buyer/garage">Back to garage</Link>
            </Button>
          </BuyerEmptyState>
        </Card>
      ) : null}

      {vehicle ? (
        <>
          <BuyerPageHeader
            eyebrow="My Garage"
            title={vehicleTitle(vehicle)}
            description={`${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ''}`}
            actions={
              <>
                <Button
                  className="h-10 rounded-full bg-[#0E9A6A] text-[#FFFBF4] hover:bg-[#087A53]"
                  onClick={() => openConciergeChat({ vehicleId })}
                >
                  Concierge
                </Button>
                <Button variant="outline" className="h-10 rounded-full" onClick={() => void load()}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-full"
                  onClick={() => {
                    setForm(formFromVehicle(vehicle));
                    setEditing(true);
                  }}
                  disabled={saving}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" className="h-10 rounded-full" onClick={() => void deleteVehicle()} disabled={saving}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            }
          />

          <Card className={BUYER_SURFACE}>
            <div className="grid grid-cols-1 md:grid-cols-3">
              <div className="relative aspect-[16/10] min-h-[200px] overflow-hidden bg-[#12241C] md:col-span-1 md:aspect-auto md:min-h-[240px]">
                <GarageVehiclePhoto
                  src={vehicleImageSrc(vehicle)}
                  alt={vehicleTitle(vehicle)}
                  className="absolute inset-0 h-full w-full object-cover"
                  iconClassName="h-16 w-16 text-white/35"
                />
              </div>
              <div className="space-y-4 p-6 md:col-span-2">
                <VehicleStatusStrip status={vehicle.vehicleStatus} nextServiceDate={vehicle.nextServiceDate} />
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">VIN</dt>
                    <dd className="font-medium">{vehicle.vin || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Mileage</dt>
                    <dd className="font-medium">{vehicle.mileageKm != null ? `${vehicle.mileageKm.toLocaleString()} km` : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Color</dt>
                    <dd className="font-medium">{vehicle.color || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Fuel</dt>
                    <dd className="font-medium">{vehicle.fuelType ? VEHICLE_FUEL_TYPE_LABELS[vehicle.fuelType] : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Transmission</dt>
                    <dd className="font-medium">{vehicle.transmission ? VEHICLE_TRANSMISSION_LABELS[vehicle.transmission] : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Trim</dt>
                    <dd className="font-medium">{vehicle.trim || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Engine</dt>
                    <dd className="font-medium">{vehicle.engine || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Drivetrain</dt>
                    <dd className="font-medium">{vehicle.driveType ? VEHICLE_DRIVE_TYPE_LABELS[vehicle.driveType] : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Body</dt>
                    <dd className="font-medium">{vehicle.bodyType ? VEHICLE_BODY_TYPE_LABELS[vehicle.bodyType] : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Tyres</dt>
                    <dd className="font-medium">{vehicle.tyreSize || '—'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </Card>

          {editing ? (
            <Card className={cn(BUYER_SURFACE, 'p-5 sm:p-6')}>
              <h2 className="text-base font-bold tracking-tight">Edit vehicle</h2>
              <div className="mt-5">
                <GarageVehicleFormFields form={form} onChange={setForm} disabled={saving} />
              </div>
              <div className="mt-4 flex gap-2">
                <Button className="rounded-xl" onClick={() => void saveVehicle()} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </Card>
          ) : null}

          <Card className={cn(BUYER_SURFACE, 'p-5 sm:p-6')}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Wrench className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">Service log</h3>
                  <p className="text-xs text-muted-foreground">Notes, photos, and follow-ups from completed jobs</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                Auto-refreshes every 15s
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Service type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {SERVICE_HISTORY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{SERVICE_HISTORY_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterProvider} onValueChange={setFilterProvider}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All providers</SelectItem>
                  {providerOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-10 text-center text-sm text-muted-foreground">
                No visits yet. Book a service with this vehicle selected — when the provider completes the job, their notes appear here.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <ServiceLogCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </Card>

          <Card className={cn(BUYER_SURFACE, 'p-5 sm:p-6')}>
            <h3 className="text-lg font-bold tracking-tight">Documents</h3>
            <p className="mt-1 text-sm text-muted-foreground">Logbook, insurance, and inspection records for this vehicle.</p>
            <div className="mt-4">
              <VehicleDocumentsPanel customerId={customerId} vehicleId={vehicle.id} />
            </div>
          </Card>
        </>
      ) : null}
    </BuyerPageShell>
  );
}
