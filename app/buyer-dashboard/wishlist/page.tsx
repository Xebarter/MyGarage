'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProductImage } from '@/components/product-image';
import {
  BUYER_SURFACE,
  BuyerEmptyState,
  BuyerPageHeader,
  BuyerPageShell,
} from '@/components/buyer/buyer-page-chrome';
import { ChevronDown, Heart, Package, Search, Trash2, ExternalLink, ChevronRight } from 'lucide-react';
import { formatUgx } from '@/lib/format-ugx';
import { homeCardTone } from '@/lib/home-card-tones';
import { cn } from '@/lib/utils';

const DEFAULT_PRODUCT_IMAGE = '/products/default.jpg';

function usableWishlistImage(value: unknown): string | null | undefined {
  if (typeof value === 'string') {
    const t = value.trim();
    if (t && t !== DEFAULT_PRODUCT_IMAGE) return t;
    return null;
  }
  if (value === null) return null;
  return undefined;
}

interface WishlistItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  category?: string;
  imageUrl?: string | null;
}

function WishlistCardSkeleton() {
  return (
    <Card className={cn(BUYER_SURFACE, 'overflow-hidden')}>
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-2/3 max-w-[200px]" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-6 w-28" />
      </div>
    </Card>
  );
}

export default function BuyerWishlistPage() {
  const [customerId, setCustomerId] = useState('');
  const [sessionResolved, setSessionResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [query, setQuery] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    const localId = localStorage.getItem('currentBuyerId') || '';
    const email = (localStorage.getItem('currentBuyerEmail') || '').trim();

    try {
      let resolvedCustomerId = localId;
      if (!resolvedCustomerId && email) {
        const customerRes = await fetch(`/api/customers?email=${encodeURIComponent(email)}`);
        if (customerRes.ok) {
          const customer = (await customerRes.json()) as { id?: string };
          if (customer?.id) {
            resolvedCustomerId = customer.id;
            localStorage.setItem('currentBuyerId', resolvedCustomerId);
          }
        }
      }

      setSessionResolved(true);

      if (!resolvedCustomerId) {
        setCustomerId('');
        setItems([]);
        return;
      }

      setCustomerId(resolvedCustomerId);
      const response = await fetch(`/api/buyer/wishlist?customerId=${encodeURIComponent(resolvedCustomerId)}`);
      if (!response.ok) {
        setItems([]);
        return;
      }
      const data = await response.json();
      const mapped: WishlistItem[] = (Array.isArray(data) ? data : []).map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ''),
        productId: typeof item.productId === 'string' ? item.productId : undefined,
        name: String(item.productName ?? ''),
        price: Number(item.priceSnapshot) || 0,
        category: String(item.categorySnapshot || 'General'),
        imageUrl: usableWishlistImage(item.imageUrl),
      }));
      setItems(mapped);
    } catch (error) {
      console.error('Failed to bootstrap wishlist:', error);
      setItems([]);
      setSessionResolved(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const addItemAsync = async () => {
    const name = draftName.trim();
    const price = Number(draftPrice);
    if (!name || Number.isNaN(price) || price <= 0 || !customerId) return;

    try {
      const response = await fetch('/api/buyer/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          productName: name,
          priceSnapshot: price,
          categorySnapshot: draftCategory.trim() || 'General',
        }),
      });
      if (!response.ok) return;
      setDraftName('');
      setDraftPrice('');
      setDraftCategory('');
      await bootstrap();
    } catch (error) {
      console.error('Failed to add wishlist item:', error);
    }
  };

  const removeItemAsync = async (id: string) => {
    setRemovingId(id);
    try {
      await fetch(`/api/buyer/wishlist/${id}`, { method: 'DELETE' });
      await bootstrap();
    } catch (error) {
      console.error('Failed to remove wishlist item:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q),
    );
  }, [items, query]);

  const showSignedOut = sessionResolved && !customerId;
  const showEmpty = !loading && customerId && filtered.length === 0;
  const hasQueryNoHits = !loading && customerId && items.length > 0 && filtered.length === 0;

  return (
    <BuyerPageShell>
      <BuyerPageHeader
        eyebrow="Saved"
        title="Wishlist"
        description="Parts and products you save from the storefront, ready to revisit with photos and prices."
        actions={
          !loading && customerId ? (
            <>
              <Badge variant="secondary" className="rounded-full px-3 py-1 font-medium">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </Badge>
              <Button asChild variant="outline" className="h-10 gap-1 rounded-full">
                <Link href="/">
                  Continue shopping
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </>
          ) : null
        }
      />

      {showSignedOut ? (
        <Card className={BUYER_SURFACE}>
          <BuyerEmptyState
            icon={Heart}
            title="Sign in to use your wishlist"
            description="Create an account or sign in as a buyer so saved products sync here across visits."
          >
            <Button asChild>
              <Link href="/auth">Sign in or register</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Browse store</Link>
            </Button>
          </BuyerEmptyState>
        </Card>
      ) : null}

      {!showSignedOut && customerId ? (
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 rounded-xl pl-9"
            placeholder="Search by name or category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search wishlist"
          />
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <WishlistCardSkeleton />
          <WishlistCardSkeleton />
          <WishlistCardSkeleton />
        </div>
      ) : null}

      {!loading && customerId ? (
        <Collapsible open={manualOpen} onOpenChange={setManualOpen} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_8px_24px_rgba(11,18,32,0.04)]">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-foreground hover:bg-muted/40"
            >
              <span>Add a note manually (optional)</span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', manualOpen && 'rotate-180')} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-4 border-t border-border px-4 py-4">
              <p className="text-xs text-muted-foreground">
                For reminders that are not tied to a storefront listing. Linked products from the heart button include
                images automatically.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input placeholder="Name" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
                <Input
                  placeholder="Price (UGX)"
                  type="number"
                  min="0"
                  value={draftPrice}
                  onChange={(e) => setDraftPrice(e.target.value)}
                />
                <Input placeholder="Category (optional)" value={draftCategory} onChange={(e) => setDraftCategory(e.target.value)} />
                <Button type="button" onClick={() => void addItemAsync()} className="gap-2">
                  <Heart className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {hasQueryNoHits ? (
        <Card className={BUYER_SURFACE}>
          <BuyerEmptyState
            icon={Search}
            title="No matches"
            description="Try a different search or clear the filter."
          >
            <Button variant="outline" type="button" onClick={() => setQuery('')}>
              Clear search
            </Button>
          </BuyerEmptyState>
        </Card>
      ) : null}

      {showEmpty && !hasQueryNoHits ? (
        <Card className={BUYER_SURFACE}>
          <BuyerEmptyState
            icon={Package}
            title="Your wishlist is empty"
            description="Tap the heart on products while browsing to save them here with pictures and prices."
          >
            <Button asChild>
              <Link href="/">Browse products</Link>
            </Button>
          </BuyerEmptyState>
        </Card>
      ) : null}

      {!loading && customerId && filtered.length > 0 ? (
        <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item, index) => {
            const imageSrc = item.imageUrl?.trim() || '';
            const hasImage = Boolean(imageSrc);
            const productHref = item.productId ? `/products/${item.productId}` : null;
            return (
              <li key={item.id}>
                <Card className={cn(BUYER_SURFACE, 'flex h-full flex-col transition hover:-translate-y-0.5 hover:border-primary/20')}>
                  <div
                    className="relative aspect-[4/3] w-full overflow-hidden"
                    style={{ backgroundColor: homeCardTone(index) }}
                  >
                    {hasImage ? (
                      <ProductImage
                        src={imageSrc}
                        alt={item.name}
                        fill
                        className="object-contain p-4 sm:p-5"
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
                        <Heart className="h-10 w-10 text-muted-foreground/70" aria-hidden />
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {item.productId ? 'No photo' : 'Manual entry'}
                        </span>
                      </div>
                    )}
                    {productHref ? (
                      <Link href={productHref} className="absolute inset-0 z-10" aria-label={`View ${item.name}`} />
                    ) : null}
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col p-4">
                    <div className="flex flex-1 flex-col gap-1">
                      {productHref ? (
                        <Link
                          href={productHref}
                          className="line-clamp-2 text-base font-semibold leading-snug text-foreground hover:underline"
                        >
                          {item.name}
                        </Link>
                      ) : (
                        <p className="line-clamp-2 text-base font-semibold leading-snug text-foreground">{item.name}</p>
                      )}
                      <p className="text-sm text-muted-foreground">{item.category || 'General'}</p>
                      <p className="mt-2 text-lg font-extrabold tabular-nums tracking-tight text-foreground">{formatUgx(item.price)}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {productHref ? (
                        <Button asChild size="sm" className="gap-1.5 rounded-full">
                          <Link href={productHref}>
                            View product
                            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={removingId === item.id}
                        onClick={() => void removeItemAsync(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}
    </BuyerPageShell>
  );
}
