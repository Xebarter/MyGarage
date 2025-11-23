import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { CartItem } from '../../lib/supabase';
import { useState } from 'react';

type CartProps = {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (partId: string, quantity: number) => void;
  onRemoveItem: (partId: string) => void;
  onCheckout: (customerInfo: { name: string; email: string; phone: string }) => void;
};

export function Cart({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartProps) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const total = cartItems.reduce((sum, item) => sum + item.part.price * item.quantity, 0);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    onCheckout({ name: customerName, email: customerEmail, phone: customerPhone });
    setShowCheckout(false);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Shopping Cart</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <ShoppingBag className="w-20 h-20 text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Your cart is empty</h3>
            <p className="text-slate-600">Add some parts to get started!</p>
          </div>
        ) : showCheckout ? (
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-xl font-bold mb-4">Checkout</h3>
            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between text-lg font-bold mb-4">
                  <span>Total</span>
                  <span className="text-orange-600">UGX {total.toLocaleString()}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
                  >
                    Place Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.part.id}
                    className="flex gap-4 p-4 bg-slate-50 rounded-lg"
                  >
                    <img
                      src={item.part.image_url}
                      alt={item.part.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 mb-1">
                        {item.part.name}
                      </h4>
                      <p className="text-sm text-slate-600 mb-2">
                        UGX {item.part.price.toLocaleString()} each
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.part.id, item.quantity - 1)
                          }
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.part.id, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.part.stock_quantity}
                          className="p-1 hover:bg-slate-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRemoveItem(item.part.id)}
                          className="ml-auto p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">
                        UGX {(item.part.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 p-6 space-y-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total</span>
                <span className="text-orange-600">UGX {total.toLocaleString()}</span>
              </div>
              <button
                onClick={() => setShowCheckout(true)}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors shadow-lg"
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
