'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Car,
  Plus,
  Trash2,
  Pencil,
  Star,
  Calendar,
  Wrench,
  RefreshCw,
  Filter,
} from 'lucide-react';
import {
  SERVICE_HISTORY_STATUSES,
  SERVICE_HISTORY_STATUS_LABELS,
  SERVICE_HISTORY_TYPE_LABELS,
  SERVICE_HISTORY_TYPES,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUSES,
  type ServiceHistoryStatus,
  type ServiceHistoryType,
  type VehicleStatus,
} from '@/lib/garage';

type BuyerVehicle = {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string | null;
  imageUrl: string | null;
  nickname: string | null;
  isPrimary: boolean;
  vehicleStatus: VehicleStatus;
  nextServiceDate: string | null;
  statusUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ServiceHistoryEntry = {
  id: string;
  vehicleId: string;
  serviceType: ServiceHistoryType;
  serviceName: string;
  serviceDate: string;
  providerId: string | null;
  providerName: string;
  notes: string;
  status: ServiceHistoryStatus;
};

type VehicleForm = {
  make: string;
  model: string;
  year: string;
  licensePlate: string;
  imageUrl: string;
  nickname: string;
  isPrimary: boolean;
};

const EMPTY_FORM: VehicleForm = {
  make: '',
  model: '',
  year: String(new Date().getFullYear()),
  licensePlate: '',
  imageUrl: '',
  nickname: '',
  isPrimary: false,
};

const POLL_MS = 15_000;

function vehicleTitle(v: BuyerVehicle) {
  if (v.nickname?.trim()) return v.nickname.trim();
  return `${v.year} ${v.make} ${v.model}`;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusBadgeVariant(status: VehicleStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'no_active_issues') return 'secondary';
  if (status === 'ready_for_pickup') return 'default';
  if (status === 'awaiting_parts') return 'outline';
  return 'destructive';
}

export default function BuyerGaragePage() {
  const [customerId, setCustomerId] = useState('');
  const [vehicles, setVehicles] = useState<BuyerVehicle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<ServiceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<VehicleForm>(EMPTY_FORM);

  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'serviceType' | 'provider' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const selected = useMemo(
    () => vehicles.find((v) => v.id === selectedId) ?? vehicles[0] ?? null,
    [vehicles, selectedId],
  );

  const providerOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const entry of history) {
      if (entry.providerId) names.set(entry.providerId, entry.providerName);
    }
    return Array.from(names.entries()).map(([id, name]) => ({ id, name }));
  }, [history]);

  const bootstrap = useCallback(async () => {
    const localId = localStorage.getItem('currentBuyerId') || '';
    const email = (localStorage.getItem('currentBuyerEmail') || '').trim();

    try {
      setLoading(true);
      let resolvedCustomerId = localId;
      if (!resolvedCustomerId && email) {
        const customerRes = await fetch(`/api/customers?email=${encodeURIComponent(email)}`);
        if (customerRes.ok) {
          const customer = await customerRes.json();
          resolvedCustomerId = customer.id;
          localStorage.setItem('currentBuyerId', resolvedCustomerId);
        }
      }

      if (!resolvedCustomerId) {
        setVehicles([]);
        setCustomerId('');
        return;
      }

      setCustomerId(resolvedCustomerId);
      const response = await fetch(`/api/buyer/vehicles?customerId=${resolvedCustomerId}`);
      if (!response.ok) {
        setVehicles([]);
        return;
      }

      const data = (await response.json()) as BuyerVehicle[];
      setVehicles(data);
      if (!selectedId && data.length > 0) {
        setSelectedId(data.find((v) => v.isPrimary)?.id ?? data[0].id);
      }
    } catch (error) {
      console.error('Failed to load garage:', error);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadHistory = useCallback(async () => {
    if (!selected) {
      setHistory([]);
      return;
    }
    try {
      setHistoryLoading(true);
      const params = new URLSearchParams();
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      if (filterType !== 'all') params.set('serviceType', filterType);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterProvider !== 'all') params.set('providerId', filterProvider);

      const response = await fetch(
        `/api/buyer/vehicles/${selected.id}/service-history?${params.toString()}`,
      );
      if (!response.ok) {
        setHistory([]);
        return;
      }
      const payload = await response.json();
      setHistory(Array.isArray(payload.history) ? payload.history : []);
      if (payload.vehicle) {
        setVehicles((prev) =>
          prev.map((v) => (v.id === payload.vehicle.id ? { ...v, ...payload.vehicle } : v)),
        );
      }
    } catch (error) {
      console.error('Failed to load service history:', error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [selected, filterType, filterStatus, filterProvider, sortBy, sortOrder]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void bootstrap();
      void loadHistory();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [bootstrap, loadHistory]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (vehicle: BuyerVehicle) => {
    setEditingId(vehicle.id);
    setShowForm(true);
    setForm({
      make: vehicle.make,
      model: vehicle.model,
      year: String(vehicle.year),
      licensePlate: vehicle.licensePlate ?? '',
      imageUrl: vehicle.imageUrl ?? '',
      nickname: vehicle.nickname ?? '',
      isPrimary: vehicle.isPrimary,
    });
  };

  const saveVehicle = async () => {
    if (!customerId || !form.make.trim() || !form.model.trim()) return;
    try {
      setSaving(true);
      const payload = {
        customerId,
        make: form.make.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        licensePlate: form.licensePlate.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        nickname: form.nickname.trim() || null,
        isPrimary: form.isPrimary,
      };

      if (editingId) {
        const response = await fetch(`/api/buyer/vehicles/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) return;
        const updated = await response.json();
        setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        setSelectedId(updated.id);
      } else {
        const response = await fetch('/api/buyer/vehicles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) return;
        const created = await response.json();
        setVehicles((prev) => [created, ...prev]);
        setSelectedId(created.id);
      }
      resetForm();
      await bootstrap();
    } catch (error) {
      console.error('Failed to save vehicle:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = async (id: string) => {
    if (!window.confirm('Remove this vehicle from your garage?')) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/buyer/vehicles/${id}`, { method: 'DELETE' });
      if (!response.ok) return;
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      if (selectedId === id) setSelectedId(null);
      await bootstrap();
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Garage</h1>
          <p className="text-muted-foreground">
            Manage your vehicles and track their full service history with MyGarage.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void bootstrap()} disabled={loading || saving}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            disabled={!customerId || saving}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add vehicle
          </Button>
        </div>
      </div>

      {!customerId && !loading ? (
        <Card className="p-8 text-center">
          <Car className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">Sign in to manage your garage</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your vehicles and service records will appear here once you are signed in.
          </p>
          <Button asChild className="mt-4">
            <Link href="/auth?role=buyer&next=/buyer/garage">Sign in</Link>
          </Button>
        </Card>
      ) : null}

      {showForm ? (
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">{editingId ? 'Edit vehicle' : 'Add a vehicle'}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Make</label>
              <Input className="mt-2" value={form.make} onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))} placeholder="Toyota" />
            </div>
            <div>
              <label className="text-sm font-medium">Model</label>
              <Input className="mt-2" value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="Corolla" />
            </div>
            <div>
              <label className="text-sm font-medium">Year</label>
              <Input className="mt-2" type="number" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">License plate (optional)</label>
              <Input className="mt-2" value={form.licensePlate} onChange={(e) => setForm((p) => ({ ...p, licensePlate: e.target.value }))} placeholder="UAB 123X" />
            </div>
            <div>
              <label className="text-sm font-medium">Nickname (optional)</label>
              <Input className="mt-2" value={form.nickname} onChange={(e) => setForm((p) => ({ ...p, nickname: e.target.value }))} placeholder="Family SUV" />
            </div>
            <div>
              <label className="text-sm font-medium">Image URL (optional)</label>
              <Input className="mt-2" value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(e) => setForm((p) => ({ ...p, isPrimary: e.target.checked }))}
            />
            Set as primary vehicle
          </label>
          <div className="flex gap-2">
            <Button onClick={() => void saveVehicle()} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add vehicle'}
            </Button>
            <Button variant="outline" onClick={resetForm} disabled={saving}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your vehicles</h2>
          {loading ? (
            <Card className="p-6 text-sm text-muted-foreground">Loading vehicles…</Card>
          ) : vehicles.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No vehicles yet. Add your first car to start tracking service history.
            </Card>
          ) : (
            vehicles.map((vehicle) => {
              const active = selected?.id === vehicle.id;
              return (
                <Card
                  key={vehicle.id}
                  className={`cursor-pointer overflow-hidden transition hover:shadow-md ${active ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedId(vehicle.id)}
                >
                  <div className="flex gap-3 p-4">
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {vehicle.imageUrl ? (
                        <Image src={vehicle.imageUrl} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Car className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold">{vehicleTitle(vehicle)}</p>
                        {vehicle.isPrimary ? <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" /> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {vehicle.licensePlate || 'No plate'} · {vehicle.make} {vehicle.model}
                      </p>
                      <Badge variant={statusBadgeVariant(vehicle.vehicleStatus)} className="mt-2">
                        {VEHICLE_STATUS_LABELS[vehicle.vehicleStatus]}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <div className="space-y-4 lg:col-span-8">
          {selected ? (
            <>
              <Card className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3">
                  <div className="relative min-h-[180px] bg-muted md:col-span-1">
                    {selected.imageUrl ? (
                      <Image src={selected.imageUrl} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full min-h-[180px] items-center justify-center">
                        <Car className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 p-6 md:col-span-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-bold">{vehicleTitle(selected)}</h2>
                        <p className="text-muted-foreground">
                          {selected.year} {selected.make} {selected.model}
                          {selected.licensePlate ? ` · ${selected.licensePlate}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="outline" onClick={() => startEdit(selected)} disabled={saving}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => void deleteVehicle(selected.id)} disabled={saving}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Current status</p>
                        <Badge variant={statusBadgeVariant(selected.vehicleStatus)} className="mt-1">
                          {VEHICLE_STATUS_LABELS[selected.vehicleStatus]}
                        </Badge>
                        <p className="mt-2 text-[11px] text-muted-foreground">Updated by your last service provider</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Next recommended service</p>
                        <p className="mt-1 flex items-center gap-2 font-semibold">
                          <Calendar className="h-4 w-4 text-primary" />
                          {formatDate(selected.nextServiceDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Service history</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" />
                    Auto-refreshes every 15s
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger><SelectValue placeholder="Service type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {SERVICE_HISTORY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{SERVICE_HISTORY_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {SERVICE_HISTORY_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{SERVICE_HISTORY_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterProvider} onValueChange={setFilterProvider}>
                    <SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All providers</SelectItem>
                      {providerOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="serviceType">Service type</SelectItem>
                      <SelectItem value="provider">Provider</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                    <SelectTrigger><SelectValue placeholder="Order" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Newest first</SelectItem>
                      <SelectItem value="asc">Oldest first</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {historyLoading ? (
                  <p className="text-sm text-muted-foreground">Loading service history…</p>
                ) : history.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    No service records yet. When you book services linked to this vehicle, they will appear here.
                  </div>
                ) : (
                  <div className="relative space-y-0">
                    <div className="absolute bottom-2 left-[11px] top-2 w-px bg-border" aria-hidden />
                    {history.map((entry) => (
                      <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                        <div className="relative z-10 mt-1 h-[22px] w-[22px] shrink-0 rounded-full border-2 border-primary bg-background" />
                        <div className="min-w-0 flex-1 rounded-lg border border-border bg-muted/10 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold">{entry.serviceName}</p>
                              <p className="text-xs text-muted-foreground">
                                {SERVICE_HISTORY_TYPE_LABELS[entry.serviceType]} · {formatDate(entry.serviceDate)}
                              </p>
                            </div>
                            <Badge variant="outline">{SERVICE_HISTORY_STATUS_LABELS[entry.status]}</Badge>
                          </div>
                          <p className="mt-2 text-sm">
                            <span className="text-muted-foreground">Provider:</span> {entry.providerName || '—'}
                          </p>
                          {entry.notes ? (
                            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{entry.notes}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="flex min-h-[320px] items-center justify-center p-8 text-center text-muted-foreground">
              {vehicles.length > 0 ? 'Select a vehicle to view details and service history.' : 'Add a vehicle to get started.'}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
