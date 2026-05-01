'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { ProductFormDialog } from '@/components/admin/product-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Edit,
  Filter,
  LayoutGrid,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';

function ProductsLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="h-36 rounded-2xl border border-border/60 bg-muted/30" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border/50 bg-muted/25" />
        ))}
      </div>
      <div className="h-28 rounded-xl border border-border/50 bg-muted/20" />
      <div className="h-96 rounded-xl border border-border/50 bg-muted/20" />
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'regular'>('all');

  const fetchProducts = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    try {
      setError(null);
      if (mode === 'refresh') setRefreshing(true);
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch products:', e);
      setError('Could not load products.');
      setProducts([]);
      toast.error('Could not load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts('initial');
  }, [fetchProducts]);

  async function deleteProduct(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        toast.success('Product removed');
      } else {
        toast.error('Failed to delete product');
      }
    } catch (e) {
      console.error('Failed to delete product:', e);
      toast.error('Failed to delete product');
    }
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setShowForm(true);
  }

  const catalogStats = useMemo(() => {
    const featured = products.filter((p) => p.featured).length;
    const pendingFeatured = products.filter((p) => p.featuredRequestPending && !p.featured).length;
    const published = products.filter((p) => p.published).length;
    return { featured, pendingFeatured, published, total: products.length };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        q.length === 0 ||
        product.name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q) ||
        product.vendorId.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q);

      const matchesFeatured =
        featuredFilter === 'all' ||
        (featuredFilter === 'featured' && product.featured) ||
        (featuredFilter === 'regular' && !product.featured);

      return matchesSearch && matchesFeatured;
    });
  }, [products, searchQuery, featuredFilter]);

  if (loading) {
    return <ProductsLoadingSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 pb-12 pt-2 md:px-8 md:pb-16 md:pt-4">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-br from-primary/[0.07] via-card to-card px-5 py-6 shadow-md ring-1 ring-black/4 dark:ring-white/6 md:px-8 md:py-7">
        <div
          className="pointer-events-none absolute -right-4 -top-16 h-44 w-44 rounded-full bg-primary/12 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary sm:flex">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Catalog
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Products</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Manage listings, pricing, featured placement, and publication state. Changes apply to the storefront
                after save.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border/80 bg-background/80"
              disabled={refreshing}
              onClick={() => void fetchProducts('refresh')}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-2 shadow-sm"
              onClick={() => {
                setEditingProduct(null);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add product
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 p-4 shadow-sm dark:bg-violet-500/10">
          <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
            <Package className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">In catalog</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{catalogStats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">Total products loaded from API</p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 shadow-sm dark:bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <Filter className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Matching filters</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {filteredProducts.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">After search & featured scope</p>
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm dark:bg-emerald-500/10">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
            <Star className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Featured</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{catalogStats.featured}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {catalogStats.pendingFeatured > 0
              ? `${catalogStats.pendingFeatured} featured request pending`
              : 'No pending featured requests'}
          </p>
        </div>
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/6 p-4 shadow-sm dark:bg-sky-500/10">
          <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
            <Package className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Published</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {catalogStats.published}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Visible on storefront when live</p>
        </div>
      </div>

      <Card className="border-border/80 shadow-sm ring-1 ring-black/4 dark:ring-white/6">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-base font-semibold tracking-tight">Search &amp; filter</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Narrow the table by name, SKU, vendor ID, or category. Featured filter applies on top of search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/35 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="products-search" className="text-xs font-medium text-muted-foreground">
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="products-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, SKU, vendor, category…"
                  className="h-10 border-border/80 bg-background/80 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Featured</Label>
              <Select
                value={featuredFilter}
                onValueChange={(v) => setFeaturedFilter(v as typeof featuredFilter)}
              >
                <SelectTrigger className="h-10 border-border/80 bg-background/80">
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All products</SelectItem>
                  <SelectItem value="featured">Featured only</SelectItem>
                  <SelectItem value="regular">Non-featured only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProductFormDialog
        open={showForm}
        onOpenChange={(next) => {
          setShowForm(next);
          if (!next) setEditingProduct(null);
        }}
        product={editingProduct}
        onSuccess={() => void fetchProducts('refresh')}
      />

      <Card className="overflow-hidden border-border/80 shadow-sm ring-1 ring-black/4 dark:ring-white/6">
        <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">Product list</CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                {filteredProducts.length === catalogStats.total
                  ? `Showing all ${filteredProducts.length} products`
                  : `Showing ${filteredProducts.length} of ${catalogStats.total} products`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/70 bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[min(32%,18rem)] pl-4 font-medium text-muted-foreground">Product</TableHead>
                <TableHead className="hidden font-medium text-muted-foreground sm:table-cell">Vendor</TableHead>
                <TableHead className="font-medium text-muted-foreground">Price</TableHead>
                <TableHead className="hidden font-medium text-muted-foreground md:table-cell">SKU</TableHead>
                <TableHead className="font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="w-[100px] pr-4 text-right font-medium text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center align-middle">
                    <div className="mx-auto flex max-w-sm flex-col items-center px-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
                        aria-hidden
                      >
                        <Package className="h-6 w-6" />
                      </div>
                      <p className="mt-4 text-base font-semibold text-foreground">No products match</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Try clearing search or switching the featured filter. Add a product to get started.
                      </p>
                      <Button
                        type="button"
                        className="mt-5 gap-2"
                        onClick={() => {
                          setSearchQuery('');
                          setFeaturedFilter('all');
                          setEditingProduct(null);
                          setShowForm(true);
                        }}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Add product
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const img = product.image?.trim();
                  const isRemote = img?.startsWith('http://') || img?.startsWith('https://');
                  return (
                    <TableRow
                      key={product.id}
                      className="border-border/60 transition-colors hover:bg-muted/25"
                    >
                      <TableCell className="pl-4 align-middle">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/80">
                            {img && isRemote ? (
                              <Image
                                src={img}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="44px"
                                unoptimized
                              />
                            ) : img ? (
                              // eslint-disable-next-line @next/next/no-img-element -- may be relative or data URL
                              <img src={img} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <Package className="h-4 w-4" aria-hidden />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground" title={product.name}>
                              {product.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground" title={product.category}>
                              {product.category || 'Uncategorized'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden align-middle sm:table-cell">
                        <span className="line-clamp-2 font-mono text-xs text-muted-foreground" title={product.vendorId}>
                          {product.vendorId}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle">
                        <span className="whitespace-nowrap text-sm font-medium tabular-nums text-foreground">
                          {formatProductPriceLabel(product)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden align-middle md:table-cell">
                        <span className="line-clamp-2 font-mono text-xs text-muted-foreground" title={product.sku}>
                          {product.sku}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex flex-wrap gap-1.5">
                          {product.published ? (
                            <Badge
                              variant="secondary"
                              className="border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-medium text-emerald-900 dark:text-emerald-100"
                            >
                              Live
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] font-medium">
                              Draft
                            </Badge>
                          )}
                          {product.featured ? (
                            <Badge
                              variant="secondary"
                              className="border border-amber-500/35 bg-amber-500/10 text-[10px] font-medium text-amber-950 dark:text-amber-100"
                            >
                              Featured
                            </Badge>
                          ) : product.featuredRequestPending ? (
                            <Badge
                              variant="secondary"
                              className="border border-sky-500/30 bg-sky-500/10 text-[10px] font-medium text-sky-950 dark:text-sky-100"
                            >
                              Requested
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="pr-4 text-right align-middle">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-border/80"
                            onClick={() => handleEdit(product)}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-border/80 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => void deleteProduct(product.id)}
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
