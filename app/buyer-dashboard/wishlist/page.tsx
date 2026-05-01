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
import { ChevronDown, Heart, Package, Search, Trash2, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <Card className="overflow-hidden p-0">
      <div className="flex gap-4 p-4">
        <Skeleton className="h-28 w-28 shrink-0 rounded-xl md:h-32 md:w-32" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
          <Skeleton className="h-4 w-2/3 max-w-[200px]" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-auto h-6 w-28" />
        </div>
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
        imageUrl:
          typeof item.imageUrl === 'string' && item.imageUrl.trim()
            ? item.imageUrl.trim()
            : item.imageUrl === null
              ? null
              : undefined,
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
    <div className="space-y-8 p-6 md:p-8 md:pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Wishlist</h1>
            {!loading && customerId ? (
              <Badge variant="secondary" className="font-normal">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </Badge>
            ) : null}
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Items you save from the storefront appear here with photos and quick links. Use the heart on any product
            card while you shop.
          </p>
        </div>
        {!loading && customerId ? (
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-1">
            <Link href="/">
              Continue shopping
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      {showSignedOut ? (
        <Card className="border-dashed bg-muted/30 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Heart className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Sign in to use your wishlist</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Create an account or sign in as a buyer so saved products sync here across visits.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/auth">Sign in or register</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Browse store</Link>
            </Button>
          </div>
        </Card>
      ) : null}

      {!showSignedOut && customerId ? (
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-9"
            placeholder="Search by name or category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search wishlist"
          />
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-1 lg:max-w-3xl">
          <WishlistCardSkeleton />
          <WishlistCardSkeleton />
          <WishlistCardSkeleton />
        </div>
      ) : null}

      {!loading && customerId ? (
        <Collapsible open={manualOpen} onOpenChange={setManualOpen} className="rounded-xl border border-border bg-card/50">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/50"
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
        <Card className="p-8 text-center">
          <p className="font-medium text-foreground">No matches</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or clear the filter.</p>
          <Button variant="outline" className="mt-4" type="button" onClick={() => setQuery('')}>
            Clear search
          </Button>
        </Card>
      ) : null}

      {showEmpty && !hasQueryNoHits ? (
        <Card className="overflow-hidden border-dashed">
          <div className="flex flex-col items-center px-6 py-12 text-center md:flex-row md:items-center md:gap-10 md:px-10 md:text-left">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Package className="h-10 w-10" />
            </div>
            <div className="mt-6 md:mt-0">
              <h2 className="text-lg font-semibold text-foreground">Your wishlist is empty</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Tap the heart on products while browsing to save them here with pictures and prices.
              </p>
              <Button asChild className="mt-6">
                <Link href="/">Browse products</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {!loading && customerId && filtered.length > 0 ? (
        <ul className="grid list-none gap-4 p-0 lg:max-w-3xl">
          {filtered.map((item) => {
            const hasImage = Boolean(item.imageUrl?.trim());
            return (
              <li key={item.id}>
                <Card className="overflow-hidden p-0 transition hover:border-primary/20 hover:shadow-sm">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch">
                    <div className="relative mx-auto h-36 w-full max-w-[200px] shrink-0 overflow-hidden rounded-xl bg-muted sm:mx-0 sm:h-32 sm:w-32 sm:max-w-none md:h-36 md:w-36">
                      {hasImage ? (
                        <ProductImage
                          src={item.imageUrl!}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 200px, 144px"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-muted to-muted/60 px-2 text-center">
                          <Heart className="h-8 w-8 text-muted-foreground/70" aria-hidden />
                          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {item.productId ? 'No photo' : 'Manual entry'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex flex-1 flex-col gap-1 sm:pr-2">
                        {item.productId ? (
                          <Link
                            href={`/products/${item.productId}`}
                            className="text-base font-semibold leading-snug text-foreground hover:underline"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          <p className="text-base font-semibold leading-snug text-foreground">{item.name}</p>
                        )}
                        <p className="text-sm text-muted-foreground">{item.category || 'General'}</p>
                        <p className="mt-2 text-lg font-bold tabular-nums text-foreground">UGX {item.price.toFixed(0)}</p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4 sm:mt-auto sm:border-0 sm:pt-0">
                        {item.productId ? (
                          <Button asChild size="sm" className="gap-1.5">
                            <Link href={`/products/${item.productId}`}>
                              View product
                              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                            </Link>
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={removingId === item.id}
                          onClick={() => void removeItemAsync(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
