'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Order } from '@/lib/db';
import { CheckCircle2, Package, Truck } from 'lucide-react';

export default function OrderConfirmationPage() {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Avoid `useSearchParams()` so Next.js can prerender without Suspense requirements.
    const id = new URLSearchParams(window.location.search).get('orderId');
    if (!id) {
      router.push('/');
      return;
    }

    fetchOrder(id);
  }, [router]);

  async function fetchOrder(id: string) {
    try {
      const response = await fetch(`/api/orders/${id}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-muted-foreground">Loading order details...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-muted-foreground">Order not found</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Success Message */}
          <div className="text-center mb-12">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">Order Confirmed!</h1>
            <p className="text-muted-foreground text-lg">Thank you for your purchase. Your order is being processed.</p>
          </div>

          {/* Order Details */}
          <div className="bg-card rounded-lg border border-border p-8 mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-6">Order Details</h2>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-1">Order Number</p>
                <p className="text-lg font-semibold text-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-1">Order Date</p>
                <p className="text-lg font-semibold text-foreground">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-1">Total Amount</p>
                <p className="text-lg font-semibold text-foreground">UGX {order.total.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-1">Status</p>
                <p className="text-lg font-semibold text-primary">
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </p>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-8 pb-8 border-b border-border">
              <h3 className="font-semibold text-foreground mb-4">Items Ordered</h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium text-foreground">{item.productName}</p>
                      <p className="text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-foreground">UGX {(item.price * item.quantity).toFixed(0)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">UGX {order.subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium text-foreground">UGX {order.tax.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-base pt-2 border-t border-border">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">UGX {order.total.toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Information */}
          <div className="bg-card rounded-lg border border-border p-8 mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Shipping Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-1">Recipient</p>
                <p className="text-foreground font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-1">Address</p>
                <p className="text-foreground">{order.shippingAddress}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-1">Email</p>
                <p className="text-foreground">{order.customerEmail}</p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-accent/30 rounded-lg border border-border p-6 mb-8">
            <h3 className="font-semibold text-foreground mb-3">What's Next?</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <Package className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>We'll prepare your order for shipment</span>
              </li>
              <li className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>You'll receive a tracking number via email</span>
              </li>
              <li className="flex items-start gap-3">
                <Package className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Delivery typically takes 1-3 business days</span>
              </li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => router.push('/buyer')}
              className="flex-1 bg-background border border-border text-foreground py-3 rounded-lg hover:bg-accent/50 transition font-semibold"
            >
              Go to Buyer Dashboard
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition font-semibold"
            >
              Continue Shopping
            </button>
            <button
              onClick={() => router.push('/cart')}
              className="flex-1 bg-background border border-border text-foreground py-3 rounded-lg hover:bg-accent/50 transition font-semibold"
            >
              View Cart
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
