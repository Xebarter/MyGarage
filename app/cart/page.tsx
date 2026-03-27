'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Trash2 } from 'lucide-react';
import { cartLineKey, type CartLineItem } from '@/lib/cart-types';

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartLineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const items = JSON.parse(localStorage.getItem('cartItems') || '[]');
    setCartItems(items);
    setLoading(false);
  }, []);

  function updateQuantity(lineKey: string, newQuantity: number) {
    if (newQuantity <= 0) {
      removeItem(lineKey);
      return;
    }

    const updated = cartItems.map((item) =>
      cartLineKey(item) === lineKey ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updated);
    localStorage.setItem('cartItems', JSON.stringify(updated));
    window.dispatchEvent(new Event('cart:updated'));
  }

  function removeItem(lineKey: string) {
    const updated = cartItems.filter((item) => cartLineKey(item) !== lineKey);
    setCartItems(updated);
    localStorage.setItem('cartItems', JSON.stringify(updated));
    window.dispatchEvent(new Event('cart:updated'));
  }

  function clearCart() {
    setCartItems([]);
    localStorage.removeItem('cartItems');
    window.dispatchEvent(new Event('cart:updated'));
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.08);
  const total = subtotal + tax;

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-muted-foreground">Loading cart...</p>
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
          <h1 className="text-3xl font-bold text-foreground mb-8">Shopping Cart</h1>

          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-4">Your cart is empty</p>
              <button
                onClick={() => router.push('/')}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2">
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                  {cartItems.map((item) => (
                    <div key={cartLineKey(item)} className="flex items-center gap-4 p-6 border-b border-border last:border-b-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                        {item.variantLabel ? (
                          <p className="text-sm text-muted-foreground mt-0.5">{item.variantLabel}</p>
                        ) : null}
                        <p className="text-muted-foreground mt-1">UGX {item.price.toFixed(0)}</p>
                      </div>

                      <div className="flex items-center border border-border rounded-lg">
                        <button
                          onClick={() => updateQuantity(cartLineKey(item), item.quantity - 1)}
                          className="px-3 py-2 text-muted-foreground hover:text-foreground"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-16 py-2 text-center border-l border-r border-border focus:outline-none bg-background text-foreground"
                        />
                        <button
                          onClick={() => updateQuantity(cartLineKey(item), item.quantity + 1)}
                          className="px-3 py-2 text-muted-foreground hover:text-foreground"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-semibold text-foreground w-24 text-right">
                        UGX {(item.price * item.quantity).toFixed(0)}
                      </span>

                      <button
                        onClick={() => removeItem(cartLineKey(item))}
                        className="text-destructive hover:text-destructive/90 transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={clearCart}
                  className="text-destructive hover:text-destructive/90 transition mt-4"
                >
                  Clear Cart
                </button>
              </div>

              {/* Order Summary */}
              <div className="bg-card rounded-lg border border-border p-6 h-fit">
                <h2 className="text-xl font-semibold text-foreground mb-6">Order Summary</h2>

                <div className="space-y-4 mb-6 pb-6 border-b border-border">
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

                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">UGX {total.toFixed(0)}</span>
                </div>

                <button
                  onClick={() => router.push('/checkout')}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition font-semibold"
                >
                  Proceed to Checkout
                </button>

                <button
                  onClick={() => router.push('/')}
                  className="w-full mt-3 bg-background border border-border text-foreground py-3 rounded-lg hover:bg-accent/50 transition font-semibold"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
