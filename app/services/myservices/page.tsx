'use client';

import { useEffect, useMemo, useState } from 'react';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  userServiceCategories,
  servicesForPublicCategory,
  providerSignupServiceOptions,
} from '@/lib/services-catalog';
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
  SlidersHorizontal,
} from 'lucide-react';

type ServiceStatus = 'active' | 'paused';

type ManagedService = {
  id: string;
  name: string;
  group: string;
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

const STORAGE_KEY = 'providerManagedServices';

const firstPublicCategory = userServiceCategories[0];
const initialForm: Omit<ManagedService, 'id'> = {
  name: firstPublicCategory?.services[0] ?? '',
  group: firstPublicCategory?.title ?? 'General',
  priceFrom: 50000,
  etaMinutes: 60,
  description: '',
  imageUrl: '',
  mobileAvailable: false,
  emergency: false,
  status: 'active',
};

export default function ServiceProviderMyServicesPage() {
  const [vendorId, setVendorId] = useState('');
  const [services, setServices] = useState<ManagedService[]>([]);
  const [applications, setApplications] = useState<AdApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ServiceStatus>('all');
  const [groupFilter, setGroupFilter] = useState<'all' | string>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<ManagedService | null>(null);
  const [formData, setFormData] = useState(initialForm);

  const [adApplying, setAdApplying] = useState<string | null>(null);
  const [bulkAdApplying, setBulkAdApplying] = useState(false);

  useEffect(() => {
    const currentVendorId = localStorage.getItem('currentVendorId') || '';
    setVendorId(currentVendorId);
    bootstrap(currentVendorId);
  }, []);

  const bootstrap = async (currentVendorId: string) => {
    setLoading(true);
    try {
      const fromStorage = localStorage.getItem(STORAGE_KEY);
      if (fromStorage) {
        const parsed = JSON.parse(fromStorage) as ManagedService[];
        setServices(
          parsed.map((row) => ({
            ...row,
            imageUrl: row.imageUrl ?? '',
          })),
        );
      } else {
        const cat = userServiceCategories[0];
        const names = (cat?.services.length ? cat.services : providerSignupServiceOptions).slice(0, 8);
        const seeded = names.map((name, index) => ({
          id: `svc-${index + 1}`,
          name,
          group: cat?.title ?? 'General',
          priceFrom: 60000 + index * 10000,
          etaMinutes: 45 + index * 5,
          description: `Professional ${name.toLowerCase()} service for all common vehicle types.`,
          imageUrl: '',
          mobileAvailable: index % 2 === 0,
          emergency: index < 3,
          status: 'active' as ServiceStatus,
        }));
        setServices(seeded);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      }

      if (currentVendorId) {
        const appsRes = await fetch(`/api/ad-applications?vendorId=${currentVendorId}`);
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          setApplications(Array.isArray(appsData) ? (appsData as AdApplication[]) : []);
        }
      }
    } catch (error) {
      console.error('Failed to bootstrap services workspace:', error);
      setServices([]);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const persistServices = (next: ManagedService[]) => {
    setServices(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return services.filter((service) => {
      const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
      const matchesGroup = groupFilter === 'all' || service.group === groupFilter;
      const matchesSearch =
        query.length === 0 ||
        service.name.toLowerCase().includes(query) ||
        service.group.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query);
      return matchesStatus && matchesGroup && matchesSearch;
    });
  }, [groupFilter, searchQuery, services, statusFilter]);

  const stats = useMemo(() => {
    const active = services.filter((service) => service.status === 'active').length;
    const paused = services.filter((service) => service.status === 'paused').length;
    const mobile = services.filter((service) => service.mobileAvailable).length;
    const adsPending = applications.filter((item) => item.status === 'pending').length;
    return { total: services.length, active, paused, mobile, adsPending };
  }, [applications, services]);

  const groupFilterChoices = useMemo(() => {
    const titles = new Set(userServiceCategories.map((c) => c.title));
    for (const s of services) titles.add(s.group);
    return Array.from(titles).sort((a, b) => a.localeCompare(b));
  }, [services]);

  const categoryOptionsForForm = useMemo(() => {
    const base = userServiceCategories.map((c) => c.title);
    const g = formData.group.trim();
    if (g && !base.includes(g)) return [g, ...base];
    return base;
  }, [formData.group]);

  const serviceNameOptions = useMemo(() => {
    const fromCat = servicesForPublicCategory(formData.group);
    const base = fromCat.length > 0 ? fromCat : formData.name.trim() ? [formData.name.trim()] : [];
    const n = formData.name.trim();
    if (n && !base.includes(n)) return [n, ...base];
    return base;
  }, [formData.group, formData.name]);

  const openCreateForm = () => {
    setEditingService(null);
    setFormData(initialForm);
    setFormOpen(true);
  };

  const openEditForm = (service: ManagedService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      group: service.group,
      priceFrom: service.priceFrom,
      etaMinutes: service.etaMinutes,
      description: service.description,
      imageUrl: service.imageUrl ?? '',
      mobileAvailable: service.mobileAvailable,
      emergency: service.emergency,
      status: service.status,
    });
    setFormOpen(true);
  };

  const saveForm = () => {
    if (!formData.name.trim()) {
      window.alert('Service name is required.');
      return;
    }
    if (editingService) {
      const next = services.map((service) =>
        service.id === editingService.id ? { ...editingService, ...formData, name: formData.name.trim() } : service
      );
      persistServices(next);
    } else {
      const next: ManagedService = {
        id: `svc-${Date.now()}`,
        ...formData,
        name: formData.name.trim(),
      };
      persistServices([next, ...services]);
    }
    setFormOpen(false);
  };

  const deleteService = (serviceId: string) => {
    if (!window.confirm('Delete this service from your listing?')) return;
    persistServices(services.filter((service) => service.id !== serviceId));
  };

  const toggleStatus = (serviceId: string) => {
    const next = services.map((service) =>
      service.id === serviceId
        ? {
            ...service,
            status: (service.status === 'active' ? 'paused' : 'active') as ServiceStatus,
          }
        : service
    );
    persistServices(next);
  };

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
          : {
              vendorId,
              scope,
              productId: service?.id,
              productName: service?.name,
              message: message || undefined,
            };

      const res = await fetch('/api/ad-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
      await bootstrap(vendorId);
      window.alert(scope === 'all' ? 'Ad request submitted for all services.' : `Ad request submitted for ${service?.name}.`);
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
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Services</h1>
          <p className="text-muted-foreground">List, optimize, and promote your service offerings.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => applyAd('all')} disabled={bulkAdApplying}>
            <Megaphone className="h-4 w-4" />
            {bulkAdApplying ? 'Submitting...' : 'Apply Ads (All Services)'}
          </Button>
          <Button className="gap-2" onClick={openCreateForm}>
            <Plus className="h-4 w-4" />
            Add Service
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total Services</p><p className="text-2xl font-bold">{stats.total}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold">{stats.active}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Paused</p><p className="text-2xl font-bold">{stats.paused}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Mobile Available</p><p className="text-2xl font-bold">{stats.mobile}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Pending Ads</p><p className="text-2xl font-bold">{stats.adsPending}</p></Card>
      </div>

      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search services by name, group, description..."
              className="pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | ServiceStatus)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>

          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            >
              <option value="all">All groups</option>
              {groupFilterChoices.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredServices.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="font-medium">No services found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try changing your filters or add a new service listing.</p>
            </div>
          ) : (
            filteredServices.map((service) => (
              <Card key={service.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="relative h-36 w-full bg-muted/30 md:h-auto md:w-52 md:shrink-0">
                    {service.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={service.imageUrl}
                        alt=""
                        className="h-full w-full object-cover md:min-h-[140px]"
                      />
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
                        <p className="text-sm text-muted-foreground">{service.group}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge className={service.status === 'active' ? 'bg-primary/10 text-primary' : ''} variant={service.status === 'active' ? 'default' : 'secondary'}>
                            {service.status}
                          </Badge>
                          {service.mobileAvailable ? <Badge variant="outline" className="gap-1"><Car className="h-3 w-3" />Mobile</Badge> : null}
                          {service.emergency ? <Badge variant="outline" className="gap-1"><Clock3 className="h-3 w-3" />Emergency</Badge> : null}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-left md:min-w-56 md:text-right">
                        <div>
                          <p className="text-sm text-muted-foreground">Price from</p>
                          <p className="font-semibold">UGX {service.priceFrom.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">ETA</p>
                          <p className="font-semibold">{service.etaMinutes} mins</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyAd('single', service)}
                        className="gap-2"
                        disabled={adApplying === service.id}
                      >
                        <Megaphone className="h-4 w-4" />
                        {adApplying === service.id ? 'Submitting...' : 'Apply Ads'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditForm(service)} className="gap-2">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleStatus(service.id)} className="gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {service.status === 'active' ? 'Pause' : 'Activate'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteService(service.id)}
                        className="gap-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Recent Ad Applications</h2>
        <div className="space-y-2">
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ad applications yet.</p>
          ) : (
            applications.slice(0, 8).map((application) => (
              <div key={application.id} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium">
                  {application.scope === 'all' ? 'All services promotion request' : application.productName || application.productId}
                </p>
                <p className="text-xs text-muted-foreground">
                  #{application.id} - {application.status} - {new Date(application.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          className="max-h-[min(92vh,720px)] max-w-2xl gap-0 overflow-y-auto p-6 sm:max-w-2xl"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit service' : 'Add a service'}</DialogTitle>
            <DialogDescription>
              Describe what you offer, set pricing and response time, and add a photo so buyers recognize your
              listing instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Basics</h3>
              <p className="text-xs text-muted-foreground">
                Categories and service names match the public services catalog (same as the buyer services page).
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="svc-group">Category</Label>
                  <select
                    id="svc-group"
                    value={formData.group}
                    onChange={(event) => {
                      const group = event.target.value;
                      const names = servicesForPublicCategory(group);
                      setFormData((prev) => ({
                        ...prev,
                        group,
                        name: names[0] ?? prev.name,
                      }));
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {categoryOptionsForForm.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="svc-name">Service</Label>
                  <select
                    id="svc-name"
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {serviceNameOptions.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Pricing & timing</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="svc-price">Starting price (UGX)</Label>
                  <Input
                    id="svc-price"
                    type="number"
                    min={0}
                    value={formData.priceFrom}
                    onChange={(event) => setFormData((prev) => ({ ...prev, priceFrom: Number(event.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Typical minimum or dispatch fee.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svc-eta">Typical ETA (minutes)</Label>
                  <Input
                    id="svc-eta"
                    type="number"
                    min={5}
                    value={formData.etaMinutes}
                    onChange={(event) => setFormData((prev) => ({ ...prev, etaMinutes: Number(event.target.value) }))}
                  />
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-2">
              <Label htmlFor="svc-desc">Description</Label>
              <textarea
                id="svc-desc"
                rows={4}
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                placeholder="What is included, vehicle types you cover, and how bookings work."
              />
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Options</h3>
              <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={formData.mobileAvailable}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, mobileAvailable: event.target.checked }))
                    }
                  />
                  <span>Mobile service (you travel to the customer)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={formData.emergency}
                    onChange={(event) => setFormData((prev) => ({ ...prev, emergency: event.target.checked }))}
                  />
                  <span>Emergency / same-day availability</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={formData.status === 'active'}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: event.target.checked ? 'active' : 'paused',
                      }))
                    }
                  />
                  <span>Active — visible to buyers</span>
                </label>
              </div>
            </section>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveForm}>
              {editingService ? 'Save changes' : 'Add service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
