'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, Megaphone, Tag, CheckCircle2, Clock3, XCircle } from 'lucide-react';

type Promotion = {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number;
  currentUses: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
};

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
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
  updatedAt: string;
};

type ApplicationScope = 'all' | 'single';
type ApplicationStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

function toDate(value: string) {
  return new Date(value);
}

export default function VendorPromotionsPage() {
  const [vendorId, setVendorId] = useState('');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [applications, setApplications] = useState<AdApplication[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scope, setScope] = useState<ApplicationScope>('all');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatusFilter>('all');

  useEffect(() => {
    const currentVendorId = localStorage.getItem('currentVendorId');
    if (!currentVendorId) {
      setLoading(false);
      setError('No active vendor session. Please log in again.');
      return;
    }

    setVendorId(currentVendorId);
    void loadData(currentVendorId);
  }, []);

  const loadData = async (currentVendorId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [promotionsRes, productsRes, appsRes] = await Promise.all([
        fetch('/api/promotions'),
        fetch(`/api/vendor/products?vendorId=${currentVendorId}`),
        fetch(`/api/ad-applications?vendorId=${currentVendorId}`),
      ]);

      if (!promotionsRes.ok || !productsRes.ok || !appsRes.ok) {
        throw new Error('Failed to load promotions workspace');
      }

      const [promotionsData, productsData, appsData] = await Promise.all([
        promotionsRes.json(),
        productsRes.json(),
        appsRes.json(),
      ]);

      setPromotions(Array.isArray(promotionsData) ? promotionsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setApplications(Array.isArray(appsData) ? appsData : []);
    } catch (loadError) {
      console.error('Failed to load vendor promotions workspace:', loadError);
      setError('Could not load promotions data. Please try again.');
      setPromotions([]);
      setProducts([]);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = useMemo(() => {
    return products.find((item) => item.id === selectedProductId);
  }, [products, selectedProductId]);

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesStatus = statusFilter === 'all' || application.status === statusFilter;
      const matchesQuery = query.length === 0
        || application.id.toLowerCase().includes(query)
        || (application.productName ?? '').toLowerCase().includes(query)
        || (application.message ?? '').toLowerCase().includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [applications, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const pending = applications.filter((item) => item.status === 'pending').length;
    const approved = applications.filter((item) => item.status === 'approved').length;
    const rejected = applications.filter((item) => item.status === 'rejected').length;
    const activePromotions = promotions.filter((promotion) => {
      if (!promotion.active) return false;
      return toDate(promotion.validUntil).getTime() >= Date.now();
    }).length;

    return {
      pending,
      approved,
      rejected,
      total: applications.length,
      activePromotions,
    };
  }, [applications, promotions]);

  const submitApplication = async () => {
    if (!vendorId || submitting) return;

    if (scope === 'single' && !selectedProduct) {
      window.alert('Please select a product for single-product ad application.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/ad-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          scope,
          productId: scope === 'single' ? selectedProduct?.id : undefined,
          productName: scope === 'single' ? selectedProduct?.name : undefined,
          message: message.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      setMessage('');
      setSelectedProductId('');
      setScope('all');
      await loadData(vendorId);
      window.alert('Ad application submitted successfully.');
    } catch (submitError) {
      console.error('Failed to submit ad application:', submitError);
      window.alert('Unable to submit ad application right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: AdApplication['status']) => {
    if (status === 'approved') {
      return <Badge className="bg-primary/10 text-primary">Approved</Badge>;
    }
    if (status === 'rejected') {
      return <Badge className="bg-destructive/10 text-destructive">Rejected</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading promotions...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promotions & Ads</h1>
          <p className="text-muted-foreground">
            Discover active campaigns and manage your ad applications in one place.
          </p>
        </div>

        <Button variant="outline" className="gap-2" onClick={() => void loadData(vendorId)}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 justify-items-start gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="h-[96px] w-full max-w-[240px] p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Active Promotions</p>
          <p className="text-2xl font-bold leading-none">{stats.activePromotions}</p>
          <p className="mt-1 text-xs text-muted-foreground">{promotions.length} total campaigns available</p>
        </Card>
        <Card className="h-[96px] w-full max-w-[240px] p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Ad Requests</p>
          <p className="text-2xl font-bold leading-none">{stats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">Submitted from your vendor account</p>
        </Card>
        <Card className="h-[96px] w-full max-w-[240px] p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Pending Review</p>
          <p className="text-2xl font-bold leading-none">{stats.pending}</p>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting admin decision</p>
        </Card>
        <Card className="h-[96px] w-full max-w-[240px] p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Approved / Rejected</p>
          <p className="text-2xl font-bold leading-none">{stats.approved} / {stats.rejected}</p>
          <p className="mt-1 text-xs text-muted-foreground">Historical outcomes</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="space-y-4 p-5 xl:col-span-2">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">New Ad Application</h2>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Application Scope</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={scope === 'all' ? 'default' : 'outline'}
                onClick={() => setScope('all')}
              >
                All products
              </Button>
              <Button
                type="button"
                variant={scope === 'single' ? 'default' : 'outline'}
                onClick={() => setScope('single')}
              >
                Single product
              </Button>
            </div>
          </div>

          {scope === 'single' && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Select Product</p>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Choose a product...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Message (optional)</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Add extra details to support your request..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <Button onClick={submitApplication} disabled={submitting} className="w-full gap-2">
            <Megaphone className="h-4 w-4" />
            {submitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </Card>

        <Card className="space-y-4 p-5 xl:col-span-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Available Promotions</h2>
          </div>
          <div className="space-y-3">
            {promotions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="font-medium">No promotions available</p>
                <p className="mt-1 text-sm text-muted-foreground">Check again later for new campaigns.</p>
              </div>
            ) : (
              promotions.map((promotion) => {
                const expired = toDate(promotion.validUntil).getTime() < Date.now();
                return (
                  <div key={promotion.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{promotion.code}</p>
                          {!promotion.active || expired ? (
                            <Badge variant="outline">Inactive</Badge>
                          ) : (
                            <Badge className="bg-primary/10 text-primary">Active</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{promotion.description}</p>
                      </div>
                      <div className="text-left text-sm md:text-right">
                        <p className="font-medium">
                          {promotion.discountType === 'percentage'
                            ? `${promotion.discountValue}% off`
                            : `UGX ${promotion.discountValue.toFixed(0)} off`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Valid until {toDate(promotion.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">My Ad Applications</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="gap-1"><Clock3 className="h-3.5 w-3.5" />Pending: {stats.pending}</Badge>
            <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Approved: {stats.approved}</Badge>
            <Badge variant="outline" className="gap-1"><XCircle className="h-3.5 w-3.5" />Rejected: {stats.rejected}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by request ID, product, or message..."
              className="pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApplicationStatusFilter)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <div className="flex h-10 items-center rounded-md border border-border bg-muted/20 px-3 text-xs text-muted-foreground">
            {filteredApplications.length} result(s)
          </div>
        </div>

        <div className="space-y-3">
          {filteredApplications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="font-medium">No ad applications found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Submit a request or adjust your filters to see more results.
              </p>
            </div>
          ) : (
            filteredApplications.map((application) => (
              <div key={application.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">
                      {application.scope === 'all'
                        ? 'All products ad request'
                        : `Single product ad request (${application.productName || application.productId})`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Request #{application.id} • Submitted {toDate(application.createdAt).toLocaleString()}
                    </p>
                    {application.message && (
                      <p className="mt-2 text-sm text-muted-foreground">{application.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(application.status)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
