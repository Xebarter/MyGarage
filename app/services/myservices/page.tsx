'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getServiceDefaultPrice,
  userServiceCategories,
  type UserServiceCategory,
} from '@/lib/services-catalog';
import { formatUgxAmount } from '@/lib/format-service-price';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Megaphone,
  Wrench,
  Clock3,
  Car,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Check,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';

type ServiceStatus = 'active' | 'paused';

type ManagedService = {
  id: string;
  name: string;
  group: string;
  categoryId: string;
  priceFrom: number;
  etaMinutes: number;
  description: string;
  imageUrl: string;
  mobileAvailable: boolean;
  emergency: boolean;
  status: ServiceStatus;
};

type AdApplication = {
  id: string;
  vendorId: string;
  scope: 'single' | 'all';
  productId?: string;
  productName?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

type ApiListing = {
  id: string;
  vendorId: string;
  categoryId: string;
  serviceName: string;
  priceUgx: number;
  status: ServiceStatus;
  etaMinutes: number | null;
  description: string;
  mobileAvailable: boolean;
  emergency: boolean;
};

const STORAGE_KEY = 'providerManagedServices';
const MIGRATED_KEY = 'providerManagedServicesMigrated';

const initialForm: Omit<ManagedService, 'id'> = {
  name: '',
  group: '',
  categoryId: '',
  priceFrom: 50000,
  etaMinutes: 60,
  description: '',
  imageUrl: '',
  mobileAvailable: false,
  emergency: false,
  status: 'active',
};

function listingToManaged(row: ApiListing): ManagedService {
  const cat = userServiceCategories.find((c) => c.id === row.categoryId);
  return {
    id: row.id,
    name: row.serviceName,
    group: cat?.title || row.categoryId,
    categoryId: row.categoryId,
    priceFrom: Number(row.priceUgx) || 0,
    etaMinutes: row.etaMinutes ?? 60,
    description: row.description || '',
    imageUrl: '',
    mobileAvailable: Boolean(row.mobileAvailable),
    emergency: Boolean(row.emergency),
    status: row.status === 'paused' ? 'paused' : 'active',
  };
}

function managedToUpsert(service: ManagedService) {
  return {
    id: service.id.startsWith('svc-') ? undefined : service.id,
    categoryId: service.categoryId,
    serviceName: service.name,
    priceUgx: service.priceFrom,
    status: service.status,
    etaMinutes: service.etaMinutes,
    description: service.description,
    mobileAvailable: service.mobileAvailable,
    emergency: service.emergency,
  };
}

/** True when the catalog still has at least one service name not yet listed under this category. */
function categoryHasUnpickedCatalogServices(cat: UserServiceCategory, managed: ManagedService[]): boolean {
  const picked = new Set(managed.filter((s) => s.group === cat.title).map((s) => s.name));
  return cat.services.some((svc) => !picked.has(svc.name));
}

const ADD_SERVICE_DISABLED_TITLE =
  'All services from this category are already on your list. You can still edit existing listings.';

export default function ServiceProviderMyServicesPage() {
  const [vendorId, setVendorId] = useState('');
  const [services, setServices] = useState<ManagedService[]>([]);
  const [applications, setApplications] = useState<AdApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Navigation: null = category grid, set = category detail
  const [activeCategory, setActiveCategory] = useState<UserServiceCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add / edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<ManagedService | null>(null);
  const [formData, setFormData] = useState(initialForm);
  const [dialogStep, setDialogStep] = useState<'pick' | 'details'>('pick');
  const [pickedCategory, setPickedCategory] = useState<UserServiceCategory | null>(null);
  const [pickedServiceNames, setPickedServiceNames] = useState<string[]>([]);
  const [pickedPrices, setPickedPrices] = useState<Record<string, number>>({});
  const [categoryLocked, setCategoryLocked] = useState(false);

  const [adApplying, setAdApplying] = useState<string | null>(null);
  const [bulkAdApplying, setBulkAdApplying] = useState(false);

  useEffect(() => {
    const currentVendorId = localStorage.getItem('currentVendorId') || '';
    setVendorId(currentVendorId);
    void bootstrap(currentVendorId);
  }, []);

  const bootstrap = async (currentVendorId: string) => {
    setLoading(true);
    try {
      let loaded: ManagedService[] = [];
      if (currentVendorId) {
        const res = await fetch(`/api/vendor/service-listings?vendorId=${encodeURIComponent(currentVendorId)}`);
        if (res.ok) {
          const data = (await res.json()) as ApiListing[];
          loaded = Array.isArray(data) ? data.map(listingToManaged) : [];
        }

        // One-time migrate localStorage listings into DB when the vendor has none yet.
        const migrated = localStorage.getItem(MIGRATED_KEY) === currentVendorId;
        if (loaded.length === 0 && !migrated) {
          const fromStorage = localStorage.getItem(STORAGE_KEY);
          if (fromStorage) {
            try {
              const parsed = JSON.parse(fromStorage) as Array<Partial<ManagedService>>;
              const toUpsert = (Array.isArray(parsed) ? parsed : [])
                .map((row) => {
                  const cat =
                    userServiceCategories.find((c) => c.title === row.group) ||
                    userServiceCategories.find((c) => c.services.some((s) => s.name === row.name));
                  if (!cat || !row.name) return null;
                  return {
                    categoryId: cat.id,
                    serviceName: String(row.name),
                    priceUgx: Number(row.priceFrom) || getServiceDefaultPrice(String(row.name), cat.id),
                    status: (row.status === 'paused' ? 'paused' : 'active') as ServiceStatus,
                    etaMinutes: Number(row.etaMinutes) || 60,
                    description: String(row.description || ''),
                    mobileAvailable: Boolean(row.mobileAvailable),
                    emergency: Boolean(row.emergency),
                  };
                })
                .filter(Boolean);

              if (toUpsert.length > 0) {
                const migrateRes = await fetch('/api/vendor/service-listings', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ vendorId: currentVendorId, listings: toUpsert }),
                });
                if (migrateRes.ok) {
                  const saved = (await migrateRes.json()) as ApiListing[];
                  loaded = Array.isArray(saved) ? saved.map(listingToManaged) : [];
                }
              }
            } catch (migrateErr) {
              console.error('Failed to migrate local service listings:', migrateErr);
            }
          }
          localStorage.setItem(MIGRATED_KEY, currentVendorId);
        }

        const appsRes = await fetch(`/api/ad-applications?vendorId=${currentVendorId}`);
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          setApplications(Array.isArray(appsData) ? (appsData as AdApplication[]) : []);
        }
      }
      setServices(loaded);
    } catch (error) {
      console.error('Failed to bootstrap services workspace:', error);
      setServices([]);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const saveListingsToApi = async (next: ManagedService[]): Promise<ManagedService[] | null> => {
    if (!vendorId) {
      window.alert('Please login as provider first.');
      return null;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/service-listings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          listings: next.map(managedToUpsert),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err?.error === 'string' ? err.error : 'Failed to save');
      }
      const saved = (await res.json()) as ApiListing[];
      const managed = Array.isArray(saved) ? saved.map(listingToManaged) : next;
      setServices(managed);
      return managed;
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : 'Failed to save services.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Group services by category title
  const servicesByCategory = useMemo(() => {
    const map = new Map<string, ManagedService[]>();
    for (const cat of userServiceCategories) {
      map.set(cat.title, []);
    }
    for (const svc of services) {
      if (map.has(svc.group)) {
        map.get(svc.group)!.push(svc);
      } else {
        map.set(svc.group, [svc]);
      }
    }
    return map;
  }, [services]);

  const overallStats = useMemo(() => {
    const active = services.filter((s) => s.status === 'active').length;
    const paused = services.filter((s) => s.status === 'paused').length;
    const adsPending = applications.filter((a) => a.status === 'pending').length;
    return { total: services.length, active, paused, adsPending };
  }, [services, applications]);

  // Only categories that have at least one service
  const populatedCategories = useMemo(
    () => userServiceCategories.filter((cat) => (servicesByCategory.get(cat.title) ?? []).length > 0),
    [servicesByCategory],
  );

  const everyCategoryHasServices = useMemo(
    () => userServiceCategories.every((cat) => (servicesByCategory.get(cat.title) ?? []).length > 0),
    [servicesByCategory],
  );

  // Services in the active category filtered by search
  const filteredCategoryServices = useMemo(() => {
    if (!activeCategory) return [];
    const catServices = servicesByCategory.get(activeCategory.title) ?? [];
    if (!searchQuery.trim()) return catServices;
    const q = searchQuery.toLowerCase();
    return catServices.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [activeCategory, servicesByCategory, searchQuery]);

  const openCreateForm = (cat?: UserServiceCategory) => {
    setEditingService(null);
    setFormData(initialForm);
    setPickedServiceNames([]);
    setPickedPrices({});
    setDialogStep('pick');
    if (cat) {
      setPickedCategory(cat);
      setCategoryLocked(true);
    } else {
      setPickedCategory(null);
      setCategoryLocked(false);
    }
    setFormOpen(true);
  };

  const openEditForm = (service: ManagedService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      group: service.group,
      categoryId: service.categoryId,
      priceFrom: service.priceFrom,
      etaMinutes: service.etaMinutes,
      description: service.description,
      imageUrl: service.imageUrl ?? '',
      mobileAvailable: service.mobileAvailable,
      emergency: service.emergency,
      status: service.status,
    });
    setPickedPrices({ [service.name]: service.priceFrom });
    setCategoryLocked(false);
    setDialogStep('details');
    setFormOpen(true);
  };

  const togglePickedService = (name: string) => {
    setPickedServiceNames((prev) => {
      const removing = prev.includes(name);
      const next = removing ? prev.filter((n) => n !== name) : [...prev, name];
      setPickedPrices((prices) => {
        if (removing) {
          const copy = { ...prices };
          delete copy[name];
          return copy;
        }
        return {
          ...prices,
          [name]: prices[name] ?? getServiceDefaultPrice(name, pickedCategory?.id),
        };
      });
      return next;
    });
  };

  const proceedToDetails = () => {
    if (!pickedCategory || pickedServiceNames.length === 0) return;
    const prices: Record<string, number> = { ...pickedPrices };
    for (const name of pickedServiceNames) {
      if (prices[name] == null) {
        prices[name] = getServiceDefaultPrice(name, pickedCategory.id);
      }
    }
    setPickedPrices(prices);
    setFormData((prev) => ({
      ...prev,
      group: pickedCategory.title,
      categoryId: pickedCategory.id,
      name: pickedServiceNames[0],
      priceFrom: prices[pickedServiceNames[0]] ?? getServiceDefaultPrice(pickedServiceNames[0], pickedCategory.id),
    }));
    setDialogStep('details');
  };

  const saveForm = async () => {
    if (editingService) {
      if (!formData.name.trim()) {
        window.alert('Service name is required.');
        return;
      }
      const price = Number(formData.priceFrom);
      if (!Number.isFinite(price) || price < 0) {
        window.alert('Enter a valid price (UGX).');
        return;
      }
      const updated: ManagedService = {
        ...editingService,
        ...formData,
        name: formData.name.trim(),
        priceFrom: price,
      };
      const next = services.map((s) => (s.id === editingService.id ? updated : s));
      const saved = await saveListingsToApi(next);
      if (saved) setFormOpen(false);
      return;
    }

    if (pickedServiceNames.length === 0 || !pickedCategory) {
      window.alert('Please select at least one service.');
      return;
    }

    const newServices: ManagedService[] = pickedServiceNames.map((name, index) => {
      const price = Number(pickedPrices[name] ?? getServiceDefaultPrice(name, pickedCategory.id));
      return {
        id: `svc-${Date.now()}-${index}`,
        ...formData,
        name,
        group: pickedCategory.title,
        categoryId: pickedCategory.id,
        priceFrom: Number.isFinite(price) && price >= 0 ? price : getServiceDefaultPrice(name, pickedCategory.id),
      };
    });

    // Merge: replace same-name listings in category, keep others
    const keys = new Set(newServices.map((s) => `${s.categoryId}\0${s.name.toLowerCase()}`));
    const kept = services.filter((s) => !keys.has(`${s.categoryId}\0${s.name.toLowerCase()}`));
    const saved = await saveListingsToApi([...kept, ...newServices]);
    if (saved) setFormOpen(false);
  };

  const deleteService = async (serviceId: string) => {
    if (!window.confirm('Delete this service from your listing?')) return;
    if (!vendorId) {
      window.alert('Please login as provider first.');
      return;
    }
    const target = services.find((s) => s.id === serviceId);
    if (!target) return;

    if (!serviceId.startsWith('svc-')) {
      setSaving(true);
      try {
        const res = await fetch(
          `/api/vendor/service-listings/${encodeURIComponent(serviceId)}?vendorId=${encodeURIComponent(vendorId)}`,
          { method: 'DELETE' },
        );
        if (!res.ok) throw new Error('Failed to delete');
        setServices((prev) => prev.filter((s) => s.id !== serviceId));
      } catch (error) {
        console.error(error);
        window.alert('Failed to delete service.');
      } finally {
        setSaving(false);
      }
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  const toggleStatus = async (serviceId: string) => {
    const next = services.map((s) =>
      s.id === serviceId
        ? { ...s, status: (s.status === 'active' ? 'paused' : 'active') as ServiceStatus }
        : s,
    );
    await saveListingsToApi(next);
  };

  const editCatalogDefault = editingService
    ? getServiceDefaultPrice(editingService.name, editingService.categoryId)
    : null;

  const applyAd = async (scope: 'single' | 'all', service?: ManagedService) => {
    if (!vendorId) {
      window.alert('Please login as provider first.');
      return;
    }
    const message = window.prompt('Optional note for admin review');
    try {
      if (scope === 'all') setBulkAdApplying(true);
      else setAdApplying(service?.id || null);
      const payload =
        scope === 'all'
          ? { vendorId, scope, message: message || undefined }
          : { vendorId, scope, productId: service?.id, productName: service?.name, message: message || undefined };
      const res = await fetch('/api/ad-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
      await bootstrap(vendorId);
      window.alert(
        scope === 'all' ? 'Ad request submitted for all services.' : `Ad request submitted for ${service?.name}.`,
      );
    } catch (error) {
      console.error('Failed to apply ad:', error);
      window.alert('Could not submit ad request now.');
    } finally {
      setAdApplying(null);
      setBulkAdApplying(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading services workspace...</div>;
  }

  return (
    <div className="space-y-8 p-5 md:p-8">

      {/* ── CATEGORY DETAIL VIEW ─────────────────────────────────────────────── */}
      {activeCategory ? (() => {
        const catServices = servicesByCategory.get(activeCategory.title) ?? [];
        const catActive = catServices.filter((s) => s.status === 'active').length;
        const canAddCatalogService = categoryHasUnpickedCatalogServices(activeCategory, services);
        return (
          <div className="space-y-6">
            {/* Breadcrumb header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setActiveCategory(null); setSearchQuery(''); }}
                  className="gap-1.5 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  All categories
                </Button>
                <span className="text-muted-foreground">/</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{activeCategory.emoji}</span>
                  <h1 className="text-xl font-bold">{activeCategory.title}</h1>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => applyAd('all')}
                  disabled={bulkAdApplying || catServices.length === 0}
                >
                  <Megaphone className="h-4 w-4" />
                  {bulkAdApplying ? 'Submitting...' : 'Promote all'}
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => openCreateForm(activeCategory)}
                  disabled={!canAddCatalogService}
                  title={!canAddCatalogService ? ADD_SERVICE_DISABLED_TITLE : undefined}
                >
                  <Plus className="h-4 w-4" />
                  Add service
                </Button>
              </div>
            </div>

            {/* Mini stats */}
            {catServices.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Total', value: catServices.length },
                  { label: 'Active', value: catActive, highlight: true },
                  { label: 'Paused', value: catServices.length - catActive },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="rounded-lg border border-border bg-card px-4 py-2 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={cn('ml-2 font-semibold', highlight && 'text-primary')}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            {catServices.length > 3 && (
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search services..."
                  className="pl-9"
                />
              </div>
            )}

            {/* Service list */}
            <div className="space-y-3">
              {filteredCategoryServices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-12 text-center">
                  {catServices.length === 0 ? (
                    <>
                      <div className="text-5xl mb-4">{activeCategory.emoji}</div>
                      <p className="font-semibold text-lg">No services yet</p>
                      <p className="mt-1 text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                        {activeCategory.useWhen}
                      </p>
                      <Button
                        onClick={() => openCreateForm(activeCategory)}
                        className="gap-2"
                        disabled={!canAddCatalogService}
                        title={!canAddCatalogService ? ADD_SERVICE_DISABLED_TITLE : undefined}
                      >
                        <Plus className="h-4 w-4" />
                        Add your first service
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">No services match your search</p>
                      <p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p>
                    </>
                  )}
                </div>
              ) : (
                filteredCategoryServices.map((service) => (
                  <Card key={service.id} className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      <div className="relative h-36 w-full bg-muted/30 md:h-auto md:w-48 md:shrink-0">
                        {service.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={service.imageUrl} alt="" className="h-full w-full object-cover md:min-h-[140px]" />
                        ) : (
                          <div className="flex h-full min-h-[140px] items-center justify-center bg-gradient-to-br from-primary/15 to-accent/20 text-muted-foreground">
                            <Wrench className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-4 p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="font-semibold">{service.name}</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge
                                className={service.status === 'active' ? 'bg-primary/10 text-primary' : ''}
                                variant={service.status === 'active' ? 'default' : 'secondary'}
                              >
                                {service.status}
                              </Badge>
                              {service.mobileAvailable && (
                                <Badge variant="outline" className="gap-1">
                                  <Car className="h-3 w-3" />Mobile
                                </Badge>
                              )}
                              {service.emergency && (
                                <Badge variant="outline" className="gap-1">
                                  <Clock3 className="h-3 w-3" />Emergency
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-left md:min-w-48 md:text-right">
                            <div>
                              <p className="text-sm text-muted-foreground">Price from</p>
                              <p className="font-semibold">{formatUgxAmount(service.priceFrom)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">ETA</p>
                              <p className="font-semibold">{service.etaMinutes} mins</p>
                            </div>
                          </div>
                        </div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline" size="sm"
                            onClick={() => applyAd('single', service)}
                            className="gap-2"
                            disabled={adApplying === service.id}
                          >
                            <Megaphone className="h-4 w-4" />
                            {adApplying === service.id ? 'Submitting...' : 'Promote'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditForm(service)} className="gap-2">
                            <Edit className="h-4 w-4" />Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => toggleStatus(service.id)} className="gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            {service.status === 'active' ? 'Pause' : 'Activate'}
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            onClick={() => deleteService(service.id)}
                            className="gap-2 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })() : (

      /* ── CATEGORY GRID VIEW ──────────────────────────────────────────────── */
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Services</h1>
              <p className="text-muted-foreground mt-1">Your service offerings, organised by category.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {services.length > 0 && (
                <Button
                  variant="outline" className="gap-2"
                  onClick={() => applyAd('all')}
                  disabled={bulkAdApplying}
                >
                  <Megaphone className="h-4 w-4" />
                  {bulkAdApplying ? 'Submitting…' : 'Promote all'}
                </Button>
              )}
              <Button className="gap-2" onClick={() => openCreateForm()}>
                <Plus className="h-4 w-4" />
                Add service
              </Button>
            </div>
          </div>

          {/* Stats — only when there is something to show */}
          {services.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Total', value: overallStats.total },
                { label: 'Active', value: overallStats.active, accent: true },
                { label: 'Paused', value: overallStats.paused },
                { label: 'Pending ads', value: overallStats.adsPending },
              ].map(({ label, value, accent }) => (
                <Card key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={cn('mt-1 text-2xl font-bold', accent && value > 0 && 'text-primary')}>{value}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state — no services at all */}
          {populatedCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 px-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-4xl">
                🔧
              </div>
              <h2 className="text-xl font-semibold">No services added yet</h2>
              <p className="mt-2 mb-7 max-w-sm text-sm text-muted-foreground">
                Add the services you offer and they will be grouped here by category so customers can find and book you.
              </p>
              <Button onClick={() => openCreateForm()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add your first service
              </Button>
            </div>
          ) : (
            /* Category list — full-width cards, stacked; titles wrap in full */
            <div className="flex flex-col gap-4">
              {populatedCategories.map((cat) => {
                const catServices = servicesByCategory.get(cat.title) ?? [];
                const catActive = catServices.filter((s) => s.status === 'active').length;
                const catPaused = catServices.length - catActive;
                const activeShare =
                  catServices.length > 0 ? Math.round((catActive / catServices.length) * 100) : 0;
                const canAddCatalogServiceForCard = categoryHasUnpickedCatalogServices(cat, services);

                return (
                  <article
                    key={cat.id}
                    className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-transparent transition-all duration-300 hover:border-primary/20 hover:shadow-md hover:shadow-primary/[0.06] hover:ring-primary/10"
                  >
                    {/* Top highlight — subtle on hover */}
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      aria-hidden
                    />

                    <div className="flex flex-col sm:flex-row sm:items-stretch">
                      {/* Emoji column — reads as a brand tile */}
                      <div className="flex shrink-0 flex-row items-center gap-4 border-b border-border/50 bg-gradient-to-br from-muted/50 via-muted/25 to-transparent p-5 sm:w-[7.5rem] sm:flex-col sm:justify-center sm:gap-0 sm:border-b-0 sm:border-r sm:border-border/50 sm:px-4 sm:py-6">
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/90 text-3xl shadow-sm ring-1 ring-border/60 backdrop-blur-sm transition-transform duration-300 group-hover:scale-[1.02] sm:h-[4.5rem] sm:w-[4.5rem] sm:text-4xl"
                          aria-hidden
                        >
                          {cat.emoji}
                        </span>
                      </div>

                      {/* Body + primary action */}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <button
                          type="button"
                          onClick={() => setActiveCategory(cat)}
                          className="flex w-full flex-1 flex-col gap-4 p-5 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-row sm:items-start sm:gap-5 sm:p-6"
                        >
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <h2 className="min-w-0 max-w-full text-pretty text-lg font-semibold tracking-tight text-foreground break-words [overflow-wrap:anywhere] sm:text-xl">
                                {cat.title}
                              </h2>
                              <span className="shrink-0 rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
                                {catServices.length} listing{catServices.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {catActive > 0 ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
                                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary ring-2 ring-primary/25" />
                                  {catActive} active
                                </span>
                              ) : null}
                              {catPaused > 0 ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                                  {catPaused} paused
                                </span>
                              ) : null}
                            </div>

                            {/* Active share — quick health read */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                <span>Availability mix</span>
                                <span className="tabular-nums text-foreground/80">{activeShare}% active</span>
                              </div>
                              <div
                                className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted"
                                role="presentation"
                              >
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 ease-out"
                                  style={{ width: `${activeShare}%` }}
                                />
                              </div>
                            </div>

                            {/* Service preview — wraps; long names get title tooltip */}
                            <div className="flex flex-wrap gap-2">
                              {catServices.slice(0, 6).map((s) => (
                                <span
                                  key={s.id}
                                  title={s.name}
                                  className={cn(
                                    'inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors',
                                    s.status === 'active'
                                      ? 'border-primary/20 bg-primary/5 text-foreground'
                                      : 'border-border/80 bg-muted/30 text-muted-foreground',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'h-1.5 w-1.5 shrink-0 rounded-full',
                                      s.status === 'active' ? 'bg-primary' : 'bg-muted-foreground/45',
                                    )}
                                  />
                                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">{s.name}</span>
                                </span>
                              ))}
                              {catServices.length > 6 ? (
                                <span className="inline-flex items-center rounded-lg border border-dashed border-border bg-muted/20 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                  +{catServices.length - 6} more in category
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <span className="mt-1 inline-flex shrink-0 items-center gap-1 self-end text-sm font-medium text-primary sm:mt-0 sm:self-center sm:flex-col sm:gap-1">
                            <span className="hidden sm:inline">Open</span>
                            <ChevronRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                          </span>
                        </button>

                        {/* Secondary actions — separated for valid HTML (no nested buttons) */}
                        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/50 bg-muted/10 px-5 py-3 sm:px-6">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => openCreateForm(cat)}
                            disabled={!canAddCatalogServiceForCard}
                            title={!canAddCatalogServiceForCard ? ADD_SERVICE_DISABLED_TITLE : undefined}
                          >
                            <Plus className="h-4 w-4" />
                            Add service
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setActiveCategory(cat)}
                          >
                            Manage category
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Ad applications */}
          {applications.length > 0 && (
            <Card className="p-5 space-y-4">
              <h2 className="font-semibold">Recent Ad Applications</h2>
              <div className="space-y-2">
                {applications.slice(0, 8).map((application) => (
                  <div key={application.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">
                      {application.scope === 'all'
                        ? 'All services promotion request'
                        : application.productName || application.productId}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      #{application.id} · {application.status} · {new Date(application.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── ADD / EDIT DIALOG (shared) ────────────────────────────────────────── */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setPickedCategory(null);
            setPickedServiceNames([]);
            setCategoryLocked(false);
          }
        }}
      >
        <DialogContent
          className="flex max-h-[min(92vh,820px)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
          showCloseButton
        >
          {/* ── STEP 1: Service picker ── */}
          {!editingService && dialogStep === 'pick' && (
            <>
              <DialogHeader className="border-b border-border px-6 py-5">
                <DialogTitle>
                  {categoryLocked && pickedCategory
                    ? `Add services — ${pickedCategory.emoji} ${pickedCategory.title}`
                    : 'Add a service'}
                </DialogTitle>
                <DialogDescription className="mt-0.5">
                  {categoryLocked
                    ? 'Pick every service you offer in this category.'
                    : 'Choose a category you have not set up yet. To add more services in a category you already use, open that category from My Services and use Add there.'}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                {/* Category grid — hidden when category is pre-selected */}
                {!categoryLocked && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      1 — Pick a category
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {userServiceCategories.map((cat) => {
                        const existingCount = (servicesByCategory.get(cat.title) ?? []).length;
                        const categoryAlreadyUsed = existingCount > 0;
                        const isSelected = pickedCategory?.id === cat.id && !categoryAlreadyUsed;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            disabled={categoryAlreadyUsed}
                            onClick={() => {
                              if (categoryAlreadyUsed) return;
                              setPickedCategory(cat);
                              setPickedServiceNames([]);
                            }}
                            className={cn(
                              'flex flex-col items-start gap-1.5 rounded-xl border px-3 py-3 text-left transition-all duration-150',
                              categoryAlreadyUsed
                                ? 'cursor-not-allowed border-border/50 bg-muted/40 opacity-65'
                                : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]',
                              isSelected &&
                                'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30',
                            )}
                          >
                            <span className={cn('text-2xl leading-none', categoryAlreadyUsed && 'grayscale')}>
                              {cat.emoji}
                            </span>
                            <span
                              className={cn(
                                'text-xs font-medium leading-snug',
                                isSelected ? 'text-primary' : categoryAlreadyUsed ? 'text-muted-foreground' : 'text-foreground',
                              )}
                            >
                              {cat.title}
                            </span>
                            {categoryAlreadyUsed ? (
                              <span className="text-[10px] font-medium leading-tight text-muted-foreground">
                                Already in your services
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Service checkboxes */}
                {pickedCategory && (
                  <div className="space-y-3">
                    {!categoryLocked && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{pickedCategory.emoji}</span>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          2 — Select services in &ldquo;{pickedCategory.title}&rdquo;
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      You can select multiple. Each becomes a separate listing you can price individually.
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {pickedCategory.services.map((svc) => {
                        const name = svc.name;
                        const isChosen = pickedServiceNames.includes(name);
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => togglePickedService(name)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all duration-150',
                              'hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]',
                              isChosen
                                ? 'border-primary bg-primary/10 font-medium text-primary shadow-sm'
                                : 'border-border bg-card text-foreground',
                            )}
                          >
                            <span className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                              isChosen ? 'border-primary bg-primary' : 'border-muted-foreground/30 bg-transparent',
                            )}>
                              {isChosen && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                            </span>
                            <span className="min-w-0 flex-1 leading-snug">
                              <span className="block">{name}</span>
                              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                                Default UGX {svc.defaultPriceUgx.toLocaleString('en-UG')}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  {pickedServiceNames.length > 0 ? (
                    <span className="font-medium text-primary">
                      {pickedServiceNames.length} service{pickedServiceNames.length > 1 ? 's' : ''} selected
                    </span>
                  ) : pickedCategory ? (
                    'Select at least one service above'
                  ) : everyCategoryHasServices ? (
                    'Every category already has listings — close and use Add on a category below.'
                  ) : (
                    'Start by picking a category'
                  )}
                </p>
                <Button
                  type="button"
                  onClick={proceedToDetails}
                  disabled={pickedServiceNames.length === 0}
                  className="gap-2"
                >
                  Next: Set details
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* ── STEP 2: Details ── */}
          {(editingService || dialogStep === 'details') && (
            <>
              <DialogHeader className="border-b border-border px-6 py-5">
                <DialogTitle>
                  {editingService
                    ? 'Edit service'
                    : `Set details for ${pickedServiceNames.length} service${pickedServiceNames.length > 1 ? 's' : ''}`}
                </DialogTitle>
                <DialogDescription className="mt-0.5">
                  {editingService
                    ? 'Update pricing, timing, and availability for this service.'
                    : 'Set a price for each service — defaults are pre-filled from the catalog. Leave, raise, or lower as you prefer.'}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                {/* Summary: selected services (add flow) */}
                {!editingService && pickedCategory && (
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xl">{pickedCategory.emoji}</span>
                      <span className="text-sm font-semibold">{pickedCategory.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {pickedServiceNames.map((name) => (
                        <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary: service being edited */}
                {editingService && (
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Editing service</p>
                    <p className="mt-0.5 font-semibold">{editingService.name}</p>
                    <p className="text-sm text-muted-foreground">{editingService.group}</p>
                  </div>
                )}

                <Separator />

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Pricing &amp; timing</h3>

                  {!editingService && pickedCategory ? (
                    <div className="space-y-3">
                      {pickedServiceNames.map((name) => {
                        const catalogDefault = getServiceDefaultPrice(name, pickedCategory.id);
                        const value = pickedPrices[name] ?? catalogDefault;
                        return (
                          <div
                            key={name}
                            className="rounded-lg border border-border/70 bg-card px-3 py-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{name}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Catalog default: {formatUgxAmount(catalogDefault)}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                onClick={() =>
                                  setPickedPrices((prev) => ({ ...prev, [name]: catalogDefault }))
                                }
                              >
                                <RotateCcw className="h-3 w-3" aria-hidden />
                                Reset
                              </Button>
                            </div>
                            <div className="mt-2 space-y-1.5">
                              <Label htmlFor={`price-${name}`}>Your price (UGX)</Label>
                              <Input
                                id={`price-${name}`}
                                type="number"
                                min={0}
                                value={value}
                                onChange={(e) =>
                                  setPickedPrices((prev) => ({
                                    ...prev,
                                    [name]: Number(e.target.value),
                                  }))
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="svc-price">Your price (UGX)</Label>
                      <Input
                        id="svc-price"
                        type="number"
                        min={0}
                        value={formData.priceFrom}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, priceFrom: Number(e.target.value) }))
                        }
                      />
                      {editCatalogDefault != null ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Catalog default: {formatUgxAmount(editCatalogDefault)}</span>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, priceFrom: editCatalogDefault }))
                            }
                          >
                            <RotateCcw className="h-3 w-3" aria-hidden />
                            Reset to default
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2 sm:max-w-xs">
                      <Label htmlFor="svc-eta">Typical ETA (minutes)</Label>
                      <Input
                        id="svc-eta"
                        type="number"
                        min={5}
                        value={formData.etaMinutes}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, etaMinutes: Number(e.target.value) }))
                        }
                      />
                    </div>
                  </div>
                </section>

                <Separator />

                <section className="space-y-2">
                  <Label htmlFor="svc-desc">Description</Label>
                  <textarea
                    id="svc-desc"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    placeholder="What's included, vehicle types you cover, and how bookings work."
                  />
                </section>

                <Separator />

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Options</h3>
                  <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
                    <label className="flex cursor-pointer items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={formData.mobileAvailable}
                        onChange={(e) => setFormData((prev) => ({ ...prev, mobileAvailable: e.target.checked }))}
                      />
                      <span>Mobile service — you travel to the customer</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={formData.emergency}
                        onChange={(e) => setFormData((prev) => ({ ...prev, emergency: e.target.checked }))}
                      />
                      <span>Emergency / same-day availability</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={formData.status === 'active'}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, status: e.target.checked ? 'active' : 'paused' }))
                        }
                      />
                      <span>Active — visible to buyers right away</span>
                    </label>
                  </div>
                </section>
              </div>

              <div className="flex items-center justify-between border-t border-border px-6 py-4 gap-3">
                {!editingService ? (
                  <Button type="button" variant="outline" onClick={() => setDialogStep('pick')} className="gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                )}
                <Button type="button" onClick={() => void saveForm()} disabled={saving} className="gap-2">
                  {editingService ? (
                    saving ? 'Saving…' : 'Save changes'
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      {saving
                        ? 'Saving…'
                        : `Add ${pickedServiceNames.length} service${pickedServiceNames.length > 1 ? 's' : ''}`}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
