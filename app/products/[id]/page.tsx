'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import type { Product, ProductVariant } from '@/lib/db';
import { findVariantForSelections, getVariantPriceBounds } from '@/lib/product-variants';
import { cartLineKey, type CartLineItem } from '@/lib/cart-types';
import { ShoppingCart, Star, Truck, Shield } from 'lucide-react';

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectionByOptionId, setSelectionByOptionId] = useState<Record<string, string>>({});

  useEffect(() => {
    params.then(({ id }) => {
      fetchProduct(id);
    });
  }, [params]);

  async function fetchProduct(productId: string) {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) {
        router.push('/');
        return;
      }
      const data = (await response.json()) as Product;
      setProduct(data);
      const v = data.variants?.length ? data.variants : [];
      const pick = v[0];
      const multi = (data.variantOptions?.length ?? 0) > 0;
      if (multi && pick?.selections) {
        setSelectionByOptionId({ ...pick.selections });
      } else {
        setSelectionByOptionId({});
      }
      setSelectedVariantId(pick?.id ?? null);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  function handleAddToCart() {
    if (!product) return;

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
    router.push('/cart');
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-muted-foreground">Loading product...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-muted-foreground">Product not found</p>
        </main>
        <Footer />
      </>
    );
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

  return (
    <>
      <Header />
      <main className="bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Product Image */}
            <div className="bg-muted rounded-lg overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Product Details */}
            <div>
              <div className="mb-6">
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">{product.category}</p>
                <h1 className="text-4xl font-bold text-foreground mt-2">{product.name}</h1>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="text-muted-foreground">4.8 (124 reviews)</span>
                  </div>
                </div>
              </div>

              <div className="mb-6 pb-6 border-b border-border">
                <p className="text-lg text-muted-foreground leading-relaxed">{product.description}</p>
              </div>

              {variantList.length > 0 ? (
                <div className="mb-6 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Choose option
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {variantList.map((v) => {
                      const isActive = selectedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSelectedVariantId(v.id);
                            if (multiAxis) {
                              setSelectionByOptionId({ ...v.selections });
                            }
                            setQuantity(1);
                          }}
                          className={`rounded-lg border p-3 text-left transition ${
                            isActive
                              ? 'border-primary bg-primary/5 shadow-xs'
                              : 'border-border hover:border-primary/50 hover:bg-muted/40'
                          }`}
                          aria-pressed={isActive}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-foreground leading-snug">{v.label}</p>
                            {isActive ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-foreground">UGX {v.price.toFixed(0)}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mb-6 pb-6 border-b border-border">
                <div className="flex items-baseline gap-4 flex-wrap">
                  <span className="text-4xl font-bold text-foreground">
                    {variantList.length > 0 && !selectedVariant
                      ? '—'
                      : `UGX ${displayPrice.toFixed(0)}`}
                  </span>
                </div>
                <p className="text-muted-foreground mt-2">SKU: {product.sku}</p>
                {priceRangeShown ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Options range from UGX {priceBounds.min.toFixed(0)} to UGX {priceBounds.max.toFixed(0)}. The price
                    above is for your current selection.
                  </p>
                ) : null}
              </div>

              {/* Product Features */}
              <div className="mb-8 space-y-3">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">Free shipping on orders over UGX 50</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">2-year warranty included</span>
                </div>
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">Fast delivery (1-3 business days)</span>
                </div>
              </div>

              {/* Quantity and Add to Cart */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-foreground font-medium">Quantity:</label>
                  <div className="flex items-center border border-border rounded-lg">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={qtyLocked}
                      className="px-3 py-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      disabled={qtyLocked}
                      onChange={(e) =>
                        setQuantity(
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                      className="w-16 py-2 text-center border-l border-r border-border focus:outline-none bg-background text-foreground disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      disabled={qtyLocked}
                      className="px-3 py-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!canPurchase}
                  className={`w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 transition ${
                    !canPurchase
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  <ShoppingCart className="w-6 h-6" />
                  {!canPurchase && variantList.length > 0 && !selectedVariant
                    ? 'Not available'
                    : !canPurchase
                      ? 'Not available'
                      : 'Add to Cart'}
                </button>
              </div>

              {/* Product Info */}
              <div className="mt-8 pt-8 border-t border-border space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Brand</h3>
                  <p className="text-muted-foreground">{product.brand}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Category</h3>
                  <p className="text-muted-foreground">{product.category}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
