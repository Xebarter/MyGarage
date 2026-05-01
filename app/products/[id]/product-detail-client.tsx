'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProductImage } from '@/components/product-image';
import { ProductWishlistButton } from '@/components/product-wishlist-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Product, ProductVariant, ProductVariantOption } from '@/lib/db';
import { findVariantForSelections, getVariantPriceBounds } from '@/lib/product-variants';
import { cartLineKey, type CartLineItem } from '@/lib/cart-types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Package, ShoppingCart, Truck, Shield } from 'lucide-react';

function initialVariantState(product: Product) {
  const v = product.variants?.length ? product.variants : [];
  const pick = v[0];
  const multi = (product.variantOptions?.length ?? 0) > 0;
  if (multi && pick?.selections) {
    return {
      selectedVariantId: pick.id ?? null,
      selectionByOptionId: { ...pick.selections } as Record<string, string>,
    };
  }
  return {
    selectedVariantId: pick?.id ?? null,
    selectionByOptionId: {} as Record<string, string>,
  };
}

function pickVariantForOptionChange(
  variants: ProductVariant[],
  options: ProductVariantOption[],
  prev: Record<string, string>,
  changingOptionId: string,
  newValueId: string,
): Record<string, string> {
  const candidates = variants.filter((v) => v.selections[changingOptionId] === newValueId);
  if (candidates.length === 0) {
    return { ...prev, [changingOptionId]: newValueId };
  }
  let best = candidates[0]!;
  let bestScore = -1;
  for (const v of candidates) {
    const score = options.filter((o) => o.id !== changingOptionId && prev[o.id] === v.selections[o.id]).length;
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return { ...best.selections };
}

function isOptionValueSelectable(
  variants: ProductVariant[],
  options: ProductVariantOption[],
  selectionByOptionId: Record<string, string>,
  optionId: string,
  valueId: string,
): boolean {
  const tentative = { ...selectionByOptionId, [optionId]: valueId };
  return variants.some((v) => options.every((opt) => v.selections[opt.id] === tentative[opt.id]));
}

export function ProductDetailClient({ initialProduct }: { initialProduct: Product }) {
  const router = useRouter();
  const product = initialProduct;
  const [quantity, setQuantity] = useState(1);
  const [{ selectedVariantId, selectionByOptionId }, setVariantState] = useState(() =>
    initialVariantState(initialProduct),
  );
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null);
  const [cartFeedback, setCartFeedback] = useState<'idle' | 'added'>('idle');

  const galleryImages = useMemo(() => {
    const urls = [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(
      (u): u is string => typeof u === 'string' && u.trim().length > 0,
    );
    return [...new Set(urls)];
  }, [product.image, product.images]);

  const [activeImage, setActiveImage] = useState(() => galleryImages[0] ?? product.image);

  useEffect(() => {
    setActiveImage(galleryImages[0] ?? product.image);
  }, [galleryImages, product.image]);

  useEffect(() => {
    void (async () => {
      const localId = localStorage.getItem('currentBuyerId') || '';
      const email = (localStorage.getItem('currentBuyerEmail') || '').trim();
      let resolved = localId;
      try {
        if (!resolved && email) {
          const r = await fetch(`/api/customers?email=${encodeURIComponent(email)}`);
          if (r.ok) {
            const c = (await r.json()) as { id?: string };
            if (c?.id) {
              resolved = c.id;
              localStorage.setItem('currentBuyerId', resolved);
            }
          }
        }
      } catch {
        /* ignore */
      }
      if (!resolved) {
        setCustomerId(null);
        setWishlistItemId(null);
        return;
      }
      setCustomerId(resolved);
      try {
        const res = await fetch(`/api/buyer/wishlist?customerId=${encodeURIComponent(resolved)}`);
        if (!res.ok) return;
        const data = (await res.json()) as Array<{ id?: string; productId?: string }>;
        const row = Array.isArray(data) ? data.find((x) => x.productId === product.id) : undefined;
        setWishlistItemId(row?.id ?? null);
      } catch {
        setWishlistItemId(null);
      }
    })();
  }, [product.id]);

  useEffect(() => {
    if (cartFeedback !== 'added') return;
    const t = window.setTimeout(() => setCartFeedback('idle'), 4500);
    return () => window.clearTimeout(t);
  }, [cartFeedback]);

  const handleWishlistChange = useCallback(
    (next: { productId: string; wishlistItemId: string | null }) => {
      if (next.productId !== product.id) return;
      setWishlistItemId(next.wishlistItemId);
    },
    [product.id],
  );

  function handleAddToCart() {
    const variants: ProductVariant[] = product.variants?.length ? product.variants : [];
    const multi = (product.variantOptions?.length ?? 0) > 0;
    const selected = multi
      ? findVariantForSelections(variants, product.variantOptions, selectionByOptionId)
      : variants.length > 0
        ? variants.find((v) => v.id === selectedVariantId) ?? variants[0]
        : null;
    if (variants.length > 0 && !selected) return;

    const unitPrice = selected ? selected.price : product.price;
    const line: CartLineItem = {
      id: product.id,
      name: product.name,
      price: unitPrice,
      image: product.image,
      quantity,
      vendorId: product.vendorId,
      variantId: selected?.id ?? null,
      variantLabel: selected?.label,
    };

    const cartItems: CartLineItem[] = JSON.parse(localStorage.getItem('cartItems') || '[]');
    const key = cartLineKey(line);
    const idx = cartItems.findIndex((item) => cartLineKey(item) === key);

    if (idx >= 0) {
      cartItems[idx] = { ...cartItems[idx], quantity: cartItems[idx].quantity + quantity };
    } else {
      cartItems.push(line);
    }

    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    window.dispatchEvent(new Event('cart:updated'));
    setCartFeedback('added');
  }

  const variantList = product.variants?.length ? product.variants : [];
  const multiAxis = (product.variantOptions?.length ?? 0) > 0;
  const selectedVariant = multiAxis
    ? findVariantForSelections(variantList, product.variantOptions, selectionByOptionId)
    : variantList.length > 0
      ? variantList.find((v) => v.id === selectedVariantId) ?? variantList[0]
      : null;
  const displayPrice = selectedVariant ? selectedVariant.price : product.price;
  const priceBounds = getVariantPriceBounds(product);
  const priceRangeShown = variantList.length > 0 && priceBounds.min !== priceBounds.max;
  const canPurchase = variantList.length === 0 || selectedVariant != null;
  const qtyLocked = variantList.length > 0 && !selectedVariant;

  const compareAt = product.compareAtPrice;
  const showCompare =
    compareAt != null && compareAt > displayPrice && Number.isFinite(compareAt) && canPurchase;
  const savePct = showCompare ? Math.max(0, Math.round((1 - displayPrice / compareAt) * 100)) : 0;

  const categoryHref = product.category
    ? `/category/products/${encodeURIComponent(product.category)}`
    : null;

  const showThumbStrip = galleryImages.length > 1;

  return (
    <>
      <Header />
      <main className="bg-background">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8 lg:pb-20 lg:pt-10">
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            {categoryHref ? (
              <>
                <Link href={categoryHref} className="hover:text-foreground">
                  {product.category}
                </Link>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              </>
            ) : null}
            <span className="line-clamp-1 font-medium text-foreground">{product.name}</span>
          </nav>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button type="button" variant="ghost" size="sm" className="gap-1 px-2 -ml-2" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10 lg:gap-12">
            <div className="space-y-3">
              <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/60 bg-muted md:aspect-5/4">
                <ProductImage
                  src={activeImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
              {showThumbStrip ? (
                <div
                  className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="list"
                  aria-label="Product images"
                >
                  {galleryImages.map((url) => {
                    const isActive = url === activeImage;
                    return (
                      <button
                        key={url}
                        type="button"
                        role="listitem"
                        onClick={() => setActiveImage(url)}
                        className={cn(
                          'relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-20 sm:w-20',
                          isActive ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border',
                        )}
                        aria-label="View image"
                        aria-current={isActive ? 'true' : undefined}
                      >
                        <ProductImage src={url} alt="" fill className="object-cover" sizes="80px" />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="min-w-0">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{product.category}</p>
                  <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {product.name}
                  </h1>
                  {product.tags?.length ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {product.tags.slice(0, 8).map((tag) => (
                        <Badge key={tag} variant="secondary" className="font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <ProductWishlistButton
                  product={product}
                  customerId={customerId}
                  savedWishlistItemId={wishlistItemId}
                  onUpdate={handleWishlistChange}
                  className="h-11 w-11 sm:h-10 sm:w-10"
                />
              </div>

              {product.description ? (
                <div className="mb-6 border-b border-border pb-6">
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">{product.description}</p>
                </div>
              ) : null}

              {multiAxis && product.variantOptions.length > 0 ? (
                <div className="mb-6 space-y-5">
                  <p className="text-sm font-semibold text-foreground">Options</p>
                  {product.variantOptions.map((opt) => (
                    <div key={opt.id} className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        {opt.name}
                        <span className="ml-2 font-normal text-muted-foreground">
                          {selectionByOptionId[opt.id]
                            ? `· ${opt.values.find((v) => v.id === selectionByOptionId[opt.id])?.label ?? ''}`
                            : null}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2" role="group" aria-label={opt.name}>
                        {opt.values.map((val) => {
                          const selectable = isOptionValueSelectable(
                            variantList,
                            product.variantOptions,
                            selectionByOptionId,
                            opt.id,
                            val.id,
                          );
                          const selected = selectionByOptionId[opt.id] === val.id;
                          return (
                            <button
                              key={val.id}
                              type="button"
                              disabled={!selectable}
                              onClick={() => {
                                const next = pickVariantForOptionChange(
                                  variantList,
                                  product.variantOptions,
                                  selectionByOptionId,
                                  opt.id,
                                  val.id,
                                );
                                const v = findVariantForSelections(variantList, product.variantOptions, next);
                                setVariantState({
                                  selectedVariantId: v?.id ?? null,
                                  selectionByOptionId: next,
                                });
                                setQuantity(1);
                              }}
                              className={cn(
                                'min-h-10 rounded-lg border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40',
                                selected
                                  ? 'border-primary bg-primary/10 text-foreground shadow-xs'
                                  : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/50',
                              )}
                              aria-pressed={selected}
                            >
                              {val.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : variantList.length > 0 ? (
                <div className="mb-6 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Choose an option</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {variantList.map((v) => {
                      const isActive = selectedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setVariantState((prev) => ({ ...prev, selectedVariantId: v.id }));
                            setQuantity(1);
                          }}
                          className={cn(
                            'rounded-xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isActive
                              ? 'border-primary bg-primary/5 shadow-xs'
                              : 'border-border hover:border-primary/50 hover:bg-muted/40',
                          )}
                          aria-pressed={isActive}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium leading-snug text-foreground">{v.label}</p>
                            {isActive ? (
                              <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                                Selected
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm font-semibold tabular-nums text-foreground">
                            UGX {v.price.toFixed(0)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mb-6 border-b border-border pb-6">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                    {variantList.length > 0 && !selectedVariant
                      ? '—'
                      : `UGX ${displayPrice.toFixed(0)}`}
                  </span>
                  {showCompare ? (
                    <>
                      <span className="text-lg text-muted-foreground line-through tabular-nums">
                        UGX {compareAt.toFixed(0)}
                      </span>
                      {savePct > 0 ? (
                        <Badge variant="destructive" className="font-semibold">
                          Save {savePct}%
                        </Badge>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  SKU: <span className="font-mono text-foreground">{product.sku}</span>
                </p>
                {priceRangeShown ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Options from UGX {priceBounds.min.toFixed(0)} to UGX {priceBounds.max.toFixed(0)}. Price shown is for
                    your current selection.
                  </p>
                ) : null}
              </div>

              <div className="mb-8 grid gap-3 rounded-xl border border-border/80 bg-muted/30 p-4 sm:grid-cols-3 sm:gap-2 sm:p-4">
                <div className="flex gap-3 sm:flex-col sm:gap-1.5">
                  <Truck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-foreground">Shipping</p>
                    <p className="text-xs text-muted-foreground">Free over UGX 50</p>
                  </div>
                </div>
                <div className="flex gap-3 sm:flex-col sm:gap-1.5">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-foreground">Warranty</p>
                    <p className="text-xs text-muted-foreground">2-year coverage</p>
                  </div>
                </div>
                <div className="flex gap-3 sm:flex-col sm:gap-1.5">
                  <Package className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-foreground">Delivery</p>
                    <p className="text-xs text-muted-foreground">1–3 business days</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-foreground" id="qty-label">
                    Quantity
                  </span>
                  <div className="flex items-center overflow-hidden rounded-lg border border-border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-none sm:h-10 sm:w-10"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={qtyLocked}
                      aria-label="Decrease quantity"
                    >
                      −
                    </Button>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      disabled={qtyLocked}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="h-11 w-14 border-x border-border bg-background text-center text-sm tabular-nums text-foreground focus-visible:outline-none disabled:opacity-50 sm:h-10"
                      aria-labelledby="qty-label"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-none sm:h-10 sm:w-10"
                      onClick={() => setQuantity((q) => q + 1)}
                      disabled={qtyLocked}
                      aria-label="Increase quantity"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {cartFeedback === 'added' ? (
                  <div
                    className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    role="status"
                  >
                    <p className="text-sm font-medium text-foreground">
                      Added {quantity === 1 ? '1 item' : `${quantity} items`} to your cart.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link href="/cart">View cart</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/">Continue shopping</Link>
                      </Button>
                    </div>
                  </div>
                ) : null}

                <Button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!canPurchase}
                  size="lg"
                  className="h-12 w-full gap-2 text-base touch-manipulation sm:h-11"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {!canPurchase && variantList.length > 0 && !selectedVariant
                    ? 'Select an option'
                    : !canPurchase
                      ? 'Unavailable'
                      : 'Add to cart'}
                </Button>
              </div>

              <Separator className="my-8" />

              <dl className="grid gap-4 sm:grid-cols-2">
                {product.brand ? (
                  <div>
                    <dt className="text-sm font-semibold text-foreground">Brand</dt>
                    <dd className="mt-1 text-sm text-muted-foreground">{product.brand}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-sm font-semibold text-foreground">Category</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{product.category}</dd>
                </div>
                {product.subcategory ? (
                  <div>
                    <dt className="text-sm font-semibold text-foreground">Subcategory</dt>
                    <dd className="mt-1 text-sm text-muted-foreground">{product.subcategory}</dd>
                  </div>
                ) : null}
                {product.weightKg != null && Number.isFinite(product.weightKg) ? (
                  <div>
                    <dt className="text-sm font-semibold text-foreground">Weight</dt>
                    <dd className="mt-1 text-sm text-muted-foreground">{product.weightKg} kg</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
