import { useState, useEffect } from 'react';
import { BarChart, PieChart, TrendingUp, DollarSign, Package, Users, ListOrdered, Calendar, Car } from 'lucide-react';
import { supabase, Category, Part, Order, RepairShop, Customer } from '../../lib/supabase';

interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface ShopPerformance {
  shop: RepairShop;
  totalOrders: number;
  totalRevenue: number;
  avgRating: number;
}

export function SuperAdminReports() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<RepairShop[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [shopPerformances, setShopPerformances] = useState<ShopPerformance[]>([]);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  async function fetchData() {
    setLoading(true);

    // Fetch categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
    } else {
      setCategories(categoriesData || []);
    }

    // Fetch parts
    const { data: partsData, error: partsError } = await supabase
      .from('parts')
      .select('*')
      .order('name');

    if (partsError) {
      console.error('Error fetching parts:', partsError);
    } else {
      setParts(partsData || []);
    }

    // Fetch orders
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
    } else {
      setOrders(ordersData || []);
    }

    // Fetch repair shops
    const { data: shopsData, error: shopsError } = await supabase
      .from('repair_shops')
      .select('*')
      .order('name');

    if (shopsError) {
      console.error('Error fetching repair shops:', shopsError);
    } else {
      setShops(shopsData || []);
    }

    // Fetch customers (if table exists)
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      // Set customers to empty array if there's an error (e.g., table doesn't exist)
      setCustomers([]);
    } else {
      setCustomers(customersData || []);
    }

    // Generate sales data
    generateSalesData(ordersData || []);

    // Calculate shop performances
    calculateShopPerformances(ordersData || [], shopsData || []);

    setLoading(false);
  }

  function generateSalesData(ordersData: Order[]) {
    // In a real implementation, this would group orders by date and calculate revenue
    // For now, we'll create sample data
    const data: SalesDataPoint[] = [];
    const now = new Date();

    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 5000) + 1000,
        orders: Math.floor(Math.random() * 30) + 5
      });
    }

    setSalesData(data);
  }

  function calculateShopPerformances(ordersData: Order[], shopsData: RepairShop[]) {
    // In a real implementation, this would calculate performance metrics for each shop
    // For now, we'll create sample data
    const performances: ShopPerformance[] = shopsData.map(shop => ({
      shop,
      totalOrders: Math.floor(Math.random() * 100),
      totalRevenue: Math.floor(Math.random() * 20000) + 5000,
      avgRating: parseFloat((Math.random() * 4 + 1).toFixed(1))
    }));

    // Sort by revenue
    performances.sort((a, b) => b.totalRevenue - a.totalRevenue);

    setShopPerformances(performances);
  }

  // Calculate statistics
  const totalProducts = parts.length;
  const totalCategories = categories.length;
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const totalShops = shops.length;
  const totalCustomers = customers.length;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date range label
  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'week': return 'Last 7 days';
      case 'month': return 'Last 30 days';
      case 'quarter': return 'Last 90 days';
      case 'year': return 'Last year';
      default: return 'Last 30 days';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Business Overview</h2>
            <div className="mt-2 sm:mt-0">
              <label htmlFor="date-range" className="mr-2 text-sm font-medium text-gray-700">
                Date Range:
              </label>
              <select
                id="date-range"
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
              >
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="quarter">Last 90 days</option>
                <option value="year">Last year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
                <p className="text-2xl font-semibold text-gray-900">{totalProducts.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Customers</h3>
                <p className="text-2xl font-semibold text-gray-900">{totalCustomers.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Car className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Repair Shops</h3>
                <p className="text-2xl font-semibold text-gray-900">{totalShops.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <ListOrdered className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
                <p className="text-2xl font-semibold text-gray-900">{totalOrders.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-teal-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-teal-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-amber-50 rounded-lg">
                <BarChart className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Avg. Order Value</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {totalOrders > 0 ? formatCurrency(totalRevenue / totalOrders) : formatCurrency(0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Revenue Trend</h3>
              <TrendingUp className="h-5 w-5 text-gray-500" />
            </div>
            <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Revenue Chart Visualization</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Displaying revenue trends for {getDateRangeLabel()}
                </p>
                <div className="mt-4 text-xs text-gray-500">
                  <p>X-axis: Dates</p>
                  <p>Y-axis: Revenue ({formatCurrency(1000)} - {formatCurrency(6000)})</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performing Shops */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Top Performing Shops</h3>
              <PieChart className="h-5 w-5 text-gray-500" />
            </div>
            <div className="h-80 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shopPerformances.slice(0, 5).map((performance, index) => (
                    <tr key={performance.shop.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{performance.shop.name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {performance.totalOrders.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(performance.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-1">
                            {performance.avgRating}
                          </span>
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
            <Calendar className="h-5 w-5 text-gray-500" />
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{order.id.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.customer_name}</div>
                      <div className="text-sm text-gray-500">{order.customer_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {/* In a full implementation, we would fetch order items to count them */}
                      <span className="text-sm text-gray-500">-</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(order.total_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}