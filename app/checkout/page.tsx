'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { CheckCircle2, ShieldCheck, Wallet, CreditCard, Tag } from 'lucide-react';
import { cartLineKey, type CartLineItem } from '@/lib/cart-types';

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    promoCode: '',
  });

  useEffect(() => {
    const items = JSON.parse(localStorage.getItem('cartItems') || '[]');
    if (items.length === 0) {
      router.push('/cart');
      setLoading(false);
      return;
    }
    setCartItems(items);
    setLoading(false);
  }, [router]);

  const { lineTotals, subtotal, tax, total } = useMemo(() => {
    const nextLineTotals = cartItems.map((item) => Math.round(Number(item.price) * Number(item.quantity)));
    const nextSubtotal = nextLineTotals.reduce((sum, v) => sum + v, 0);
    const nextTax = Math.round(nextSubtotal * 0.08);
    const nextTotal = nextSubtotal + nextTax;
    return { lineTotals: nextLineTotals, subtotal: nextSubtotal, tax: nextTax, total: nextTotal };
  }, [cartItems]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const checkoutItems = cartItems.map((item) => ({
        productId: item.id,
        name: item.variantLabel ? `${item.name} (${item.variantLabel})` : item.name,
        quantity: item.quantity,
        price: item.price,
        vendorId: item.vendorId,
      }));

      const response = await fetch('/api/paytota/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: checkoutItems,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          shippingAddress: formData.shippingAddress,
          successRedirect: undefined,
          failureRedirect: undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(typeof data?.error === 'string' ? data.error : 'Unable to initialize checkout');
      }

      const payment = await response.json();
      // Clear cart immediately to prevent accidental double checkout on mobile.
      localStorage.removeItem('cartItems');
      localStorage.setItem('currentBuyerName', formData.customerName);
      localStorage.setItem('currentBuyerEmail', formData.customerEmail);
      localStorage.setItem(
        'buyerProfile',
        JSON.stringify({
          name: formData.customerName,
          email: formData.customerEmail,
          phone: '',
        })
      );
      if (payment.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
        return;
      }
      setOrderPlaced(true);
      setTimeout(() => {
        router.push(`/order-confirmation?checkoutId=${payment.checkoutId}`);
      }, 2000);
    } catch (error) {
      console.error('Failed to place order:', error);
      setFormError(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-muted-foreground">Loading checkout...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (orderPlaced) {
    return (
      <>
        <Header />
        <main className="bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-600/10">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-foreground">Order Placed Successfully</h1>
              <p className="text-muted-foreground mt-2">Redirecting to order confirmation...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (cartItems.length === 0) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-lg font-semibold text-foreground">Your cart is empty.</p>
            <p className="text-muted-foreground mt-2">Add items to checkout.</p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              Continue Shopping
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16 pb-28 lg:pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Checkout</h1>
              <p className="text-sm text-muted-foreground">
                Enter your details once, then complete payment securely with Paytota.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Secure checkout</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Order Summary */}
            <aside className="order-1 lg:order-2 lg:col-span-1">
              <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 h-fit">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Order Summary
                </h2>

                <div className="space-y-3 pb-4 border-b border-border">
                  <div className="max-h-40 overflow-y-auto pr-1">
                    {cartItems.map((item, idx) => (
                      <div key={cartLineKey(item)} className="flex justify-between gap-3 text-sm py-2">
                        <span className="text-muted-foreground min-w-0">
                          {item.variantLabel ? `${item.name} — ${item.variantLabel}` : item.name} x{item.quantity}
                        </span>
                        <span className="font-medium text-foreground shrink-0">
                          UGX {lineTotals[idx].toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5 pt-4">
                  <div className="flex justify-between text-muted-foreground text-sm">
                    <span>Subtotal</span>
                    <span className="text-foreground font-medium">UGX {subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-sm">
                    <span>Tax (8%)</span>
                    <span className="text-foreground font-medium">UGX {tax.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-sm">
                    <span>Shipping</span>
                    <span className="text-foreground font-medium">FREE</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
                    <span className="text-base font-semibold text-foreground">Total</span>
                    <span className="text-2xl font-bold text-foreground">UGX {total.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Checkout Form */}
            <div className="order-2 lg:order-1 lg:col-span-2">
              <form id="checkoutForm" onSubmit={handleSubmit} className="space-y-6">
                {/* Shipping Information */}
                <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Shipping Information</h2>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="customerName" className="block text-sm font-medium text-foreground mb-2">
                        Full Name
                      </label>
                      <input
                        id="customerName"
                        type="text"
                        autoComplete="name"
                        required
                        value={formData.customerName}
                        onChange={(e) => {
                          setFormError(null);
                          setFormData({ ...formData, customerName: e.target.value });
                        }}
                        className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
                      />
                    </div>

                    <div>
                      <label htmlFor="customerEmail" className="block text-sm font-medium text-foreground mb-2">
                        Email Address
                      </label>
                      <input
                        id="customerEmail"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.customerEmail}
                        onChange={(e) => {
                          setFormError(null);
                          setFormData({ ...formData, customerEmail: e.target.value });
                        }}
                        className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
                      />
                    </div>

                    <div>
                      <label htmlFor="customerPhone" className="block text-sm font-medium text-foreground mb-2">
                        Phone Number
                      </label>
                      <input
                        id="customerPhone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        value={formData.customerPhone}
                        onChange={(e) => {
                          setFormError(null);
                          setFormData({ ...formData, customerPhone: e.target.value });
                        }}
                        className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
                        placeholder="2567XXXXXXXX"
                      />
                    </div>

                    <div>
                      <label htmlFor="shippingAddress" className="block text-sm font-medium text-foreground mb-2">
                        Shipping Address
                      </label>
                      <textarea
                        id="shippingAddress"
                        required
                        rows={4}
                        autoComplete="street-address"
                        value={formData.shippingAddress}
                        onChange={(e) => {
                          setFormError(null);
                          setFormData({ ...formData, shippingAddress: e.target.value });
                        }}
                        className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
                        placeholder="Street address, city, state, ZIP"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment Information
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    You will be redirected to the secure Paytota checkout to complete payment.
                  </p>
                </div>

                {/* Promo Code */}
                <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
                  <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    Promo Code <span className="text-muted-foreground font-normal text-sm">(Optional)</span>
                  </h2>
                  <div className="flex gap-2">
                    <input
                      id="promoCode"
                      type="text"
                      placeholder="Enter promo code"
                      disabled
                      value={formData.promoCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          promoCode: e.target.value.toUpperCase(),
                        })
                      }
                      className="flex-1 px-4 py-3 border border-border rounded-xl bg-muted/30 text-foreground/70 focus:outline-none"
                      aria-disabled="true"
                    />
                    <button
                      type="button"
                      disabled
                      className="px-4 py-3 bg-muted text-foreground rounded-xl opacity-60 cursor-not-allowed transition font-medium"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Promo codes aren&apos;t supported on this checkout yet.</p>
                </div>

                {formError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
                  >
                    {formError}
                  </div>
                ) : null}

                {/* Desktop submit */}
                <div className="hidden lg:block">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-xl hover:bg-primary/90 transition font-semibold disabled:opacity-50"
                  >
                    {submitting ? 'Preparing secure checkout...' : 'Continue to Paytota'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Mobile sticky CTA */}
        <div
          className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground">Total payable</p>
                <p className="text-lg font-bold text-foreground truncate">UGX {total.toFixed(0)}</p>
              </div>
              <button
                type="submit"
                form="checkoutForm"
                disabled={submitting}
                className="flex-shrink-0 bg-primary text-primary-foreground px-4 py-3 rounded-xl hover:bg-primary/90 transition font-semibold disabled:opacity-50"
              >
                {submitting ? 'Preparing...' : 'Pay with Paytota'}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
