import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  BadgeCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AdminSidebar } from './AdminSidebar';

type OrderDetail = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    price_at_time: number;
    part: {
      id: string;
      name: string;
      sku: string;
      image_url: string;
      brand: string;
    };
  }[];
};

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export function AdminOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  async function fetchOrderDetails() {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            price_at_time,
            part (
              id,
              name,
              sku,
              brand,
              image_url
            )
          )
        `)
        .eq('id', orderId)
        .single();
        
      if (error) throw error;
      
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(newStatus: OrderStatus) {
    if (!orderId) return;
    
    setUpdatingStatus(true);
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
        
      if (error) throw error;
      
      // Update local state
      if (order) {
        setOrder({ ...order, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'processing':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-indigo-500" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <AdminSidebar />
        <main className="flex-1 p-8 ml-64">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen bg-slate-50">
        <AdminSidebar />
        <main className="flex-1 p-8 ml-64">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Not Found</h2>
              <p className="text-slate-600 mb-6">The requested order could not be found.</p>
              <button
                onClick={() => navigate('/admin/orders')}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Back to Orders
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const statusOptions: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
    'pending': ['processing'],
    'processing': ['shipped'],
    'shipped': ['delivered'],
    'delivered': [],
    'cancelled': []
  };

  const availableStatuses = nextStatuses[order.status as OrderStatus] || [];

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar />
      
      <main className="flex-1 p-8 ml-64 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link 
              to="/admin/orders" 
              className="flex items-center text-orange-600 hover:text-orange-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Order Details</h1>
                <p className="text-slate-600 mt-1">Order #{order.id.substring(0, 8)}</p>
              </div>
              
              <div className="mt-4 md:mt-0 flex items-center">
                <div className="flex items-center mr-4">
                  {getStatusIcon(order.status)}
                  <span className="ml-2 text-lg font-medium capitalize">{order.status}</span>
                </div>
                
                {availableStatuses.length > 0 && (
                  <div className="relative">
                    <select
                      value=""
                      onChange={(e) => updateOrderStatus(e.target.value as OrderStatus)}
                      disabled={updatingStatus}
                      className="appearance-none bg-orange-500 text-white py-2 px-4 pr-8 rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      <option value="" disabled>
                        {updatingStatus ? 'Updating...' : 'Change Status'}
                      </option>
                      {availableStatuses.map(status => (
                        <option key={status} value={status} className="capitalize">
                          Mark as {status}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">Items in this Order</h2>
                </div>
                
                <div className="divide-y divide-slate-200">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="p-6">
                      <div className="flex">
                        {item.part.image_url ? (
                          <img 
                            src={item.part.image_url} 
                            alt={item.part.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Package className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                        
                        <div className="ml-4 flex-1">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-slate-900">{item.part.name}</h3>
                              <p className="text-slate-500 text-sm">SKU: {item.part.sku}</p>
                              <p className="text-slate-500 text-sm">Brand: {item.part.brand}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-medium text-slate-900">
                                {formatCurrency(item.price_at_time)} × {item.quantity}
                              </p>
                              <p className="text-slate-500 mt-1">
                                {formatCurrency(item.price_at_time * item.quantity)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="p-6 bg-slate-50">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-slate-900">Total</span>
                      <span className="text-2xl font-bold text-slate-900">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Customer Information */}
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">Customer Information</h2>
                </div>
                
                <div className="p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-slate-900">{order.customer_name}</h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center text-slate-600">
                          <Mail className="w-4 h-4 mr-2" />
                          <a href={`mailto:${order.customer_email}`} className="hover:text-orange-600">
                            {order.customer_email}
                          </a>
                        </div>
                        {order.customer_phone && (
                          <div className="flex items-center text-slate-600">
                            <Phone className="w-4 h-4 mr-2" />
                            <a href={`tel:${order.customer_phone}`} className="hover:text-orange-600">
                              {order.customer_phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Order Information */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">Order Information</h2>
                </div>
                
                <div className="p-6">
                  <dl className="space-y-4">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Order ID</dt>
                      <dd className="font-medium text-slate-900">#{order.id.substring(0, 8)}</dd>
                    </div>
                    
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Order Date</dt>
                      <dd className="font-medium text-slate-900 flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(order.created_at)}
                      </dd>
                    </div>
                    
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Status</dt>
                      <dd className="font-medium text-slate-900 flex items-center">
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status}</span>
                      </dd>
                    </div>
                    
                    <div className="flex justify-between pt-4 border-t border-slate-200">
                      <dt className="text-slate-600">Total Amount</dt>
                      <dd className="text-xl font-bold text-slate-900 flex items-center">
                        <DollarSign className="w-5 h-5 mr-1" />
                        {formatCurrency(order.total_amount)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              {/* Status History */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">Status History</h2>
                </div>
                
                <div className="p-6">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                    
                    <div className="space-y-6">
                      <div className="flex">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <BadgeCheck className="w-4 h-4 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="font-medium text-slate-900">Order Placed</p>
                          <p className="text-sm text-slate-500">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          ['processing', 'shipped', 'delivered'].includes(order.status) 
                            ? 'bg-green-500' 
                            : 'bg-slate-300'
                        }`}>
                          {['processing', 'shipped', 'delivered'].includes(order.status) ? (
                            <BadgeCheck className="w-4 h-4 text-white" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div className="ml-4">
                          <p className={`font-medium ${
                            ['processing', 'shipped', 'delivered'].includes(order.status) 
                              ? 'text-slate-900' 
                              : 'text-slate-500'
                          }`}>
                            Processing
                          </p>
                          {['processing', 'shipped', 'delivered'].includes(order.status) && (
                            <p className="text-sm text-slate-500">
                              {/* In a real app, this would be from order history */}
                              Processing started
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          ['shipped', 'delivered'].includes(order.status) 
                            ? 'bg-green-500' 
                            : 'bg-slate-300'
                        }`}>
                          {['shipped', 'delivered'].includes(order.status) ? (
                            <BadgeCheck className="w-4 h-4 text-white" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div className="ml-4">
                          <p className={`font-medium ${
                            ['shipped', 'delivered'].includes(order.status) 
                              ? 'text-slate-900' 
                              : 'text-slate-500'
                          }`}>
                            Shipped
                          </p>
                          {['shipped', 'delivered'].includes(order.status) && (
                            <p className="text-sm text-slate-500">
                              Package shipped
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          order.status === 'delivered' 
                            ? 'bg-green-500' 
                            : 'bg-slate-300'
                        }`}>
                          {order.status === 'delivered' ? (
                            <BadgeCheck className="w-4 h-4 text-white" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div className="ml-4">
                          <p className={`font-medium ${
                            order.status === 'delivered' 
                              ? 'text-slate-900' 
                              : 'text-slate-500'
                          }`}>
                            Delivered
                          </p>
                          {order.status === 'delivered' && (
                            <p className="text-sm text-slate-500">
                              Package delivered
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}