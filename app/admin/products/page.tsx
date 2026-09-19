'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Product, Vendor } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { ProductFormDialog } from '@/components/admin/product-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  LayoutGrid,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  Inbox,
  Star,
  Store,
  Table2,
  Trash2,
} from 'lucide-react';

const PAGE_SIZE = 24;

type CatalogFilter = 'all' | 'live' | 'draft' | 'featured' | 'requested';
type ViewMode = 'table' | 'gallery';
type SortKey = 'newest' | 'name' | 'price-asc' | 'price-desc';

function productInstant(value: Date | string | undefined): number {
  if (!value) return 0;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function formatUpdated(value: Date | string | undefined): string {
  const t = productInstant(value);
  if (!t) return '—';
  return format(new Date(t), 'd MMM yyyy');
}

function productImageSrc(product: Product): string {
  const src = (product.image || product.images?.[0] || '').trim();
  return src.length > 0 ? src : '/products/default.jpg';
}

function matchesQuery(product: Product, vendorName: string, q: string): boolean {
  if (!q) return true;
  const hay = [
    product.name,
    product.sku,
    product.brand,
    product.category,
    product.subcategory,
    product.slug,
    vendorName,
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function StatTile({
  label,
  value,
  hint,
  icon,
  progress,
  active,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  progress?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <Card
      className={cn(
        'group overflow-hidden border-border/60 bg-linear-to-b from-card to-muted/15 shadow-sm ring-1 ring-black/3 transition-all duration-200 dark:ring-white/4',
        onClick && 'cursor-pointer hover:border-border hover:shadow-md',
        active && 'border-primary/40 ring-primary/15',
      )}
    >
      <CardContent className="flex gap-3.5 p-4 sm:gap-4 sm:p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-sm transition-transform duration-200 group-hover:scale-105 sm:h-11 sm:w-11 [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5">
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-semibold uppercase leading-snug tracking-wider text-muted-foreground sm:text-[11px]">
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">{value}</p>
          {hint ? <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">{hint}</p> : null}
          {typeof progress === 'number' ? (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/80 transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!onClick) return inner;
  return (
    <button type="button" className="w-full text-left" onClick={onClick}>
      {inner}
    </button>
  );
}

function ProductsLoadingSkeleton() {
  return (
    <div className="min-h-full bg-muted/25">
      <div className="mx-auto max-w-[1600px] animate-pulse space-y-8 px-4 py-8 md:px-8 md:py-10">
        <div className="h-40 rounded-2xl border border-border/60 bg-muted/30" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-border/50 bg-muted/25" />
          ))}
        </div>
        <div className="h-[28rem] rounded-2xl border border-border/60 bg-muted/20" />
      </div>
    </div>
  );
}

function StatusBadges({ product }: { product: Product }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {product.published ? (
        <Badge className="border-transparent bg-emerald-500/12 font-medium text-emerald-800 dark:text-emerald-300">
          Live
        </Badge>
      ) : (
        <Badge variant="secondary" className="font-medium">
          Draft
        </Badge>
      )}
      {product.featured ? (
        <Badge className="border-transparent bg-amber-500/15 font-medium text-amber-800 dark:text-amber-300">
          Featured
        </Badge>
      ) : product.featuredRequestPending ? (
        <Badge className="border-transparent bg-sky-500/12 font-medium text-sky-800 dark:text-sky-300">
          Feature requested
        </Badge>
      ) : null}
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const [category, setCategory] = useState('all');
  const [vendorId, setVendorId] = useState('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [view, setView] = useState<ViewMode>('table');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mutatingIds, setMutatingIds] = useState<Set<string>>(() => new Set());
  const initialLoadDone = useRef(false);

  const vendorNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const vendor of vendors) {
      map.set(vendor.id, vendor.name);
    }
    return map;
  }, [vendors]);

  const vendorLabel = useCallback(
    (id: string) => vendorNameById.get(id) || 'Unassigned vendor',
    [vendorNameById],
  );

  const fetchCatalog = useCallback(async (opts?: { silent?: boolean }) => {
    setError(null);
    if (!opts?.silent && !initialLoadDone.current) {
      setLoading(true);
    } else if (!opts?.silent) {
      setRefreshing(true);
    }

    try {
      const [productRes, vendorRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/vendors'),
      ]);
      if (!productRes.ok) {
        throw new Error('Failed to fetch products');
      }
      const productData = await productRes.json();
      setProducts(Array.isArray(productData) ? productData : []);

      if (vendorRes.ok) {
        const vendorData = await vendorRes.json();
        setVendors(Array.isArray(vendorData) ? vendorData : []);
      }
    } catch (err) {
      console.error('Failed to fetch catalog:', err);
      setError('Could not load the catalog. Try refreshing.');
      setProducts([]);
    } finally {
      initialLoadDone.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 280);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [filter, debouncedQuery, category, vendorId, sort]);

  const stats = useMemo(() => {
    const total = products.length;
    const live = products.filter((p) => p.published).length;
    const draft = total - live;
    const featured = products.filter((p) => p.featured).length;
    const requested = products.filter((p) => p.featuredRequestPending && !p.featured).length;
    return {
      total,
      live,
      draft,
      featured,
      requested,
      liveRate: total > 0 ? (live / total) * 100 : 0,
    };
  }, [products]);

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const product of products) {
      const name = product.category?.trim();
      if (name) names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const catalogVendors = useMemo(() => {
    const used = new Set(products.map((p) => p.vendorId).filter(Boolean));
    return vendors
      .filter((v) => used.has(v.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, vendors]);

  const filtered = useMemo(() => {
    const next = products.filter((product) => {
      if (filter === 'live' && !product.published) return false;
      if (filter === 'draft' && product.published) return false;
      if (filter === 'featured' && !product.featured) return false;
      if (filter === 'requested' && !(product.featuredRequestPending && !product.featured)) return false;
      if (category !== 'all' && product.category !== category) return false;
      if (vendorId !== 'all' && product.vendorId !== vendorId) return false;
      return matchesQuery(product, vendorLabel(product.vendorId), debouncedQuery);
    });

    next.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      return productInstant(b.updatedAt ?? b.createdAt) - productInstant(a.updatedAt ?? a.createdAt);
    });
    return next;
  }, [products, filter, category, vendorId, debouncedQuery, sort, vendorLabel]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeFrom = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(safePage * PAGE_SIZE, filtered.length);

  const openCreate = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const patchProduct = async (product: Product, updates: Partial<Product>, success: string) => {
    setMutatingIds((current) => {
      const next = new Set(current);
      next.add(product.id);
      return next;
    });
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Could not update listing');
      }
      const updated = (await response.json()) as Product;
      setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, ...updated } : item)));
      toast.success(success);
    } catch (err) {
      console.error('Failed to update product:', err);
      toast.error(err instanceof Error ? err.message : 'Could not update listing');
    } finally {
      setMutatingIds((current) => {
        const next = new Set(current);
        next.delete(product.id);
        return next;
      });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/products/${pendingDelete.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Failed to delete product');
      }
      setProducts((current) => current.filter((item) => item.id !== pendingDelete.id));
      toast.success('Listing removed');
      setPendingDelete(null);
    } catch (err) {
      console.error('Failed to delete product:', err);
      toast.error(err instanceof Error ? err.message : 'Could not delete this listing');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <ProductsLoadingSkeleton />;

  return (
    <div className="min-h-full bg-muted/25">
      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 md:px-8 md:py-10">
        <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/3 dark:ring-white/4">
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/6 via-transparent to-transparent" />
          <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-primary/7 blur-3xl" />
          <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-start md:justify-between md:p-8">
            <div className="flex gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary/15 to-primary/5 text-primary shadow-sm ring-1 ring-primary/10">
                <Package className="h-8 w-8" strokeWidth={1.75} />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Catalog</p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Products</h1>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                  Curate the storefront, publish drafts, and approve featured placements. Shoppers only see live
                  listings.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                disabled={refreshing}
                onClick={() => void fetchCatalog()}
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button type="button" className="h-10 gap-2 rounded-xl" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add product
              </Button>
            </div>
          </div>
        </header>

        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile
            label="Catalog"
            value={stats.total.toLocaleString()}
            hint="All SKUs in inventory"
            icon={<Package />}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <StatTile
            label="Live"
            value={stats.live.toLocaleString()}
            hint={stats.draft ? `${stats.draft.toLocaleString()} currently hidden` : 'Every listing is published'}
            icon={<Eye />}
            progress={stats.liveRate}
            active={filter === 'live'}
            onClick={() => setFilter('live')}
          />
          <StatTile
            label="Drafts"
            value={stats.draft.toLocaleString()}
            hint="Hidden from the shop"
            icon={<EyeOff />}
            active={filter === 'draft'}
            onClick={() => setFilter('draft')}
          />
          <StatTile
            label="Featured"
            value={stats.featured.toLocaleString()}
            hint="Homepage and promo placement"
            icon={<Star />}
            active={filter === 'featured'}
            onClick={() => setFilter('featured')}
          />
          <StatTile
            label="Requests"
            value={stats.requested.toLocaleString()}
            hint="Vendors waiting for featuring"
            icon={<Inbox />}
            active={filter === 'requested'}
            onClick={() => setFilter('requested')}
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <div className="flex flex-col gap-4 border-b border-border/60 bg-muted/20 p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div className="relative min-w-0 flex-1 md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, SKU, brand, vendor…"
                className="h-11 rounded-xl bg-background pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 w-[11.5rem] rounded-xl bg-background">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger className="h-11 w-[12.5rem] rounded-xl bg-background">
                  <SelectValue placeholder="Vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vendors</SelectItem>
                  {catalogVendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                <SelectTrigger className="h-11 w-[10.5rem] rounded-xl bg-background">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Recently updated</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                  <SelectItem value="price-asc">Price low–high</SelectItem>
                  <SelectItem value="price-desc">Price high–low</SelectItem>
                </SelectContent>
              </Select>
              <div className="inline-flex rounded-xl border border-border/70 bg-background p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={view === 'table' ? 'secondary' : 'ghost'}
                  className="h-9 rounded-lg px-3"
                  onClick={() => setView('table')}
                  aria-pressed={view === 'table'}
                >
                  <Table2 className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:ml-1.5">Table</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={view === 'gallery' ? 'secondary' : 'ghost'}
                  className="h-9 rounded-lg px-3"
                  onClick={() => setView('gallery')}
                  aria-pressed={view === 'gallery'}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:ml-1.5">Gallery</span>
                </Button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Package className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">No listings match</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Adjust filters, or add a product to grow the catalog.
                </p>
              </div>
              <Button type="button" className="mt-2 rounded-xl" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add product
              </Button>
            </div>
          ) : view === 'gallery' ? (
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pageItems.map((product) => {
                const busy = mutatingIds.has(product.id);
                return (
                  <article
                    key={product.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm transition hover:border-border hover:shadow-md"
                  >
                    <button
                      type="button"
                      className="relative aspect-[4/3] overflow-hidden bg-muted"
                      onClick={() => openEdit(product)}
                    >
                      <Image
                        src={productImageSrc(product)}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 25vw"
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    </button>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="space-y-1">
                        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                          {product.name}
                        </h2>
                        <p className="truncate text-xs text-muted-foreground">
                          {vendorLabel(product.vendorId)}
                          {product.sku ? ` · ${product.sku}` : ''}
                        </p>
                      </div>
                      <StatusBadges product={product} />
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {formatProductPriceLabel(product)}
                      </p>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Switch
                            checked={product.published}
                            disabled={busy}
                            onCheckedChange={(checked) =>
                              void patchProduct(
                                product,
                                { published: checked },
                                checked ? 'Listing is live' : 'Listing unpublished',
                              )
                            }
                          />
                          Storefront
                        </label>
                        <ProductActions
                          product={product}
                          busy={busy}
                          onEdit={() => openEdit(product)}
                          onApproveFeature={() =>
                            void patchProduct(product, { featured: true }, 'Featured on homepage')
                          }
                          onUnfeature={() => void patchProduct(product, { featured: false }, 'Removed from featured')}
                          onDelete={() => setPendingDelete(product)}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[18rem]">Product</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Storefront</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((product) => {
                  const busy = mutatingIds.has(product.id);
                  return (
                    <TableRow key={product.id} className="group">
                      <TableCell>
                        <button
                          type="button"
                          className="flex min-w-0 items-center gap-3 text-left"
                          onClick={() => openEdit(product)}
                        >
                          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
                            <Image
                              src={productImageSrc(product)}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">{product.name}</span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {product.sku || 'No SKU'}
                              {product.brand ? ` · ${product.brand}` : ''}
                            </span>
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{vendorLabel(product.vendorId)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[10rem] truncate text-sm text-muted-foreground">
                        {product.category || '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-medium tabular-nums">
                        {formatProductPriceLabel(product)}
                      </TableCell>
                      <TableCell>
                        <StatusBadges product={product} />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={product.published}
                          disabled={busy}
                          onCheckedChange={(checked) =>
                            void patchProduct(
                              product,
                              { published: checked },
                              checked ? 'Listing is live' : 'Listing unpublished',
                            )
                          }
                          aria-label={product.published ? 'Unpublish listing' : 'Publish listing'}
                        />
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {formatUpdated(product.updatedAt ?? product.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ProductActions
                          product={product}
                          busy={busy}
                          onEdit={() => openEdit(product)}
                          onApproveFeature={() =>
                            void patchProduct(product, { featured: true }, 'Featured on homepage')
                          }
                          onUnfeature={() => void patchProduct(product, { featured: false }, 'Removed from featured')}
                          onDelete={() => setPendingDelete(product)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {filtered.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-muted-foreground sm:text-sm">
                Showing {rangeFrom.toLocaleString()}–{rangeTo.toLocaleString()} of {filtered.length.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-muted-foreground">
                  {safePage} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSuccess={() => void fetchCatalog({ silent: true })}
      />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.name} will be deleted from the catalog. This cannot be undone.`
                : 'This listing will be deleted from the catalog.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep listing</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? 'Removing…' : 'Delete product'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductActions({
  product,
  busy,
  onEdit,
  onApproveFeature,
  onUnfeature,
  onDelete,
}: {
  product: Product;
  busy: boolean;
  onEdit: () => void;
  onApproveFeature: () => void;
  onUnfeature: () => void;
  onDelete: () => void;
}) {
  const needsFeatureReview = product.featuredRequestPending && !product.featured;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" disabled={busy}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Listing actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="h-4 w-4" />
          Edit listing
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/products/${product.id}`} target="_blank" rel="noreferrer">
            <ArrowUpRight className="h-4 w-4" />
            View on storefront
          </Link>
        </DropdownMenuItem>
        {needsFeatureReview ? (
          <DropdownMenuItem onClick={onApproveFeature}>
            <Check className="h-4 w-4" />
            Approve feature
          </DropdownMenuItem>
        ) : product.featured ? (
          <DropdownMenuItem onClick={onUnfeature}>
            <Star className="h-4 w-4" />
            Remove featured
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onApproveFeature}>
            <Star className="h-4 w-4" />
            Feature on homepage
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
