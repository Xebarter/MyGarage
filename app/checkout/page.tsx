'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { CheckCircle2 } from 'lucide-react';
import { cartLineKey, type CartLineItem } from '@/lib/cart-types';

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
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
      return;
    }
    setCartItems(items);
    setLoading(false);
  }, [router]);

  const lineTotals = cartItems.map((item) => Math.round(Number(item.price) * Number(item.quantity)));
  const subtotal = lineTotals.reduce((sum, v) => sum + v, 0);
  const tax = Math.round(subtotal * 0.08);
  const total = subtotal + tax;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

      if (response.ok) {
        const payment = await response.json();
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
        localStorage.removeItem('cartItems');
        setTimeout(() => {
          router.push(`/order-confirmation?checkoutId=${payment.checkoutId}`);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to place order:', error);
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
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-foreground mb-2">Order Placed Successfully!</h1>
              <p className="text-muted-foreground mb-8">Redirecting to order confirmation...</p>
            </div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Shipping Information */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Shipping Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                      <input
                        type="email"
                        required
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
                        placeholder="2567XXXXXXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Shipping Address</label>
                      <textarea
                        required
                        rows={3}
                        value={formData.shippingAddress}
                        onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
                        placeholder="Street address, city, state, ZIP"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-2">Payment Information</h2>
                  <p className="text-sm text-muted-foreground">
                    You will be redirected to the secure Paytota checkout to complete payment.
                  </p>
                </div>

                {/* Promo Code */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Promo Code (Optional)</h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter promo code"
                      value={formData.promoCode}
                      onChange={(e) => setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })}
                      className="flex-1 px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
                    />
                    <button
                      type="button"
                      className="px-4 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition font-medium"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-lg hover:bg-primary/90 transition font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Preparing secure checkout...' : 'Continue to Paytota'}
                </button>
              </form>
            </div>

            {/* Order Summary */}
            <div className="bg-card rounded-lg border border-border p-6 h-fit">
              <h2 className="text-xl font-semibold text-foreground mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6 pb-6 border-b border-border">
                {cartItems.map((item, idx) => (
                  <div key={cartLineKey(item)} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.variantLabel ? `${item.name} — ${item.variantLabel}` : item.name} x{item.quantity}
                    </span>
                    <span className="font-medium text-foreground">UGX {lineTotals[idx].toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-6 pb-6 border-b border-border">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>UGX {subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (8%)</span>
                  <span>UGX {tax.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>FREE</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">Total</span>
                <span className="text-2xl font-bold text-foreground">UGX {total.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
