import { useState, useEffect } from 'react';
import { 
  Package, 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Truck, 
  CheckCircle, 
  Clock, 
  XCircle,
  Wrench,
  Link
} from 'lucide-react';
import { supabase, Part, CartItem, ServicePart } from '../../lib/supabase';

interface SparePartsOrderingProps {
  serviceId?: string;
  onPartsOrdered?: (parts: CartItem[]) => void;
}

export function SparePartsOrdering({ serviceId, onPartsOrdered }: SparePartsOrderingProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'ordered' | 'processing' | 'shipped' | 'delivered'>('idle');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [serviceParts, setServiceParts] = useState<ServicePart[]>([]);
  const [linkingParts, setLinkingParts] = useState<boolean>(false);

  useEffect(() => {
    fetchParts();
    if (serviceId) {
      fetchServiceParts();
    }
  }, [serviceId]);

  async function fetchParts() {
    try {
      setLoading(true);
      let query = supabase
        .from('parts')
        .select('*')
        .limit(50);
        
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setParts(data || []);
    } catch (err) {
      console.error('Error fetching parts:', err);
      alert('Failed to load parts catalog');
    } finally {
      setLoading(false);
    }
  }

  async function fetchServiceParts() {
    if (!serviceId) return;
    
    try {
      const { data, error } = await supabase
        .from('service_parts')
        .select(`
          *,
          parts (*)
        `)
        .eq('service_id', serviceId);
      
      if (error) throw error;
      setServiceParts(data || []);
    } catch (err) {
      console.error('Error fetching service parts:', err);
    }
  }

  const addToCart = (part: Part) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.part.id === part.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.part.id === part.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { part, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (partId: string) => {
    setCart(prevCart => prevCart.filter(item => item.part.id !== partId));
  };

  const updateQuantity = (partId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(partId);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.part.id === partId ? { ...item, quantity } : item
      )
    );
  };

  const linkPartsToService = async () => {
    if (!serviceId || cart.length === 0) return;
    
    setLinkingParts(true);
    try {
      // Create service_parts entries for each item in cart
      const servicePartEntries = cart.map(item => ({
        service_id: serviceId,
        part_id: item.part.id,
        quantity: item.quantity,
        notes: ''
      }));
      
      const { error } = await supabase
        .from('service_parts')
        .insert(servicePartEntries);
      
      if (error) throw error;
      
      // Refresh service parts
      await fetchServiceParts();
      
      alert('Parts successfully linked to service');
    } catch (err) {
      console.error('Error linking parts to service:', err);
      alert('Failed to link parts to service');
    } finally {
      setLinkingParts(false);
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.part.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const orderParts = async () => {
    if (cart.length === 0) {
      alert('Please add parts to your cart before ordering');
      return;
    }

    setOrdering(true);
    try {
      // In a real implementation, this would create an actual order in the database
      // For now, we'll simulate the process
      const newOrderId = 'ORD-' + Date.now();
      setOrderId(newOrderId);
      setOrderStatus('ordered');
      
      // Simulate order processing
      setTimeout(() => setOrderStatus('processing'), 2000);
      setTimeout(() => setOrderStatus('shipped'), 5000);
      setTimeout(() => setOrderStatus('delivered'), 10000);
      
      if (onPartsOrdered) {
        onPartsOrdered(cart);
      }
      
      // Clear cart after successful order
      setCart([]);
    } catch (err) {
      console.error('Error ordering parts:', err);
      alert('Failed to place order');
    } finally {
      setOrdering(false);
    }
  };

  const getOrderStatusIcon = () => {
    switch (orderStatus) {
      case 'ordered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-yellow-500" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  const getOrderStatusText = () => {
    switch (orderStatus) {
      case 'ordered':
        return 'Order Placed';
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Ready to Order';
    }
  };

  const filteredParts = parts.filter(part => 
    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Package className="mr-2" />
          Spare Parts Ordering
        </h2>
        {cart.length > 0 && (
          <div className="flex items-center bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
            <ShoppingCart className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">{getTotalItems()} items</span>
          </div>
        )}
      </div>

      {serviceId && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700 flex items-center">
            <Wrench className="w-4 h-4 mr-2" />
            Ordering parts for service: {serviceId}
          </p>
        </div>
      )}

      {orderId && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {getOrderStatusIcon()}
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Order {orderId}</p>
                <p className="text-sm text-gray-500">{getOrderStatusText()}</p>
              </div>
            </div>
            {orderStatus !== 'delivered' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Tracking
              </span>
            )}
          </div>
          
          {orderStatus === 'shipped' && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">Estimated delivery: 2-3 business days</p>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            placeholder="Search parts by name, description, or brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Service Parts (if linked to a service) */}
      {serviceId && serviceParts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
            <Link className="w-4 h-4 mr-2" />
            Parts linked to this service
          </h3>
          <div className="bg-gray-50 rounded-lg p-3">
            <ul className="space-y-2">
              {serviceParts.map((servicePart) => (
                <li key={servicePart.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{servicePart.parts?.name || 'Unknown part'}</span>
                  <span className="text-gray-500">Qty: {servicePart.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Parts Catalog */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Parts Catalog</h3>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No parts found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {filteredParts.map((part) => (
              <div key={part.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{part.name}</h4>
                    <p className="text-sm text-gray-500">{part.brand}</p>
                    <p className="text-sm text-gray-700 mt-1">${part.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-start">
                    <button
                      onClick={() => addToCart(part)}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {part.compatible_models && (
                  <p className="mt-2 text-xs text-gray-500">
                    Fits: {part.compatible_models}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shopping Cart */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Shopping Cart</h3>
        
        {cart.length === 0 ? (
          <div className="text-center py-6">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Your cart is empty</h3>
            <p className="mt-1 text-sm text-gray-500">Add parts from the catalog above.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-60 overflow-y-auto mb-4">
              {cart.map((item) => (
                <div key={item.part.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.part.name}</h4>
                    <p className="text-sm text-gray-500">{item.part.brand}</p>
                    <p className="text-sm text-gray-700">${item.part.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => updateQuantity(item.part.id, item.quantity - 1)}
                      className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="mx-2 text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.part.id, item.quantity + 1)}
                      className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.part.id)}
                      className="ml-3 p-1 rounded-md text-red-500 hover:text-red-700 hover:bg-red-100"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between text-base font-medium text-gray-900 mb-4">
                <p>Total</p>
                <p>${getTotalPrice().toFixed(2)}</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={orderParts}
                  disabled={ordering || cart.length === 0}
                  className={`flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    ordering || cart.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
                  }`}
                >
                  {ordering ? 'Processing Order...' : 'Place Order'}
                </button>
                
                {serviceId && (
                  <button
                    onClick={linkPartsToService}
                    disabled={linkingParts || cart.length === 0}
                    className={`flex-1 flex justify-center py-2 px-4 border border-orange-600 rounded-md shadow-sm text-sm font-medium text-orange-600 ${
                      linkingParts || cart.length === 0
                        ? 'bg-gray-100 cursor-not-allowed'
                        : 'bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
                    }`}
                  >
                    {linkingParts ? 'Linking...' : 'Link to Service'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}