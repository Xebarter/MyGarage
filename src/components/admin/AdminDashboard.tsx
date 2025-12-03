import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ListOrdered, 
  Users, 
  BarChart3, 
  Calendar,
  Settings,
  LogOut
} from 'lucide-react';
import { AdminHeader } from './AdminHeader';
import { AdminProducts } from './AdminProducts';
import { AdminOrders } from './AdminOrders';
import { AdminAppointments } from './AdminAppointments';
import { AdminReports } from './AdminReports';
import { AdminSettings } from './AdminSettings';

export function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'appointments' | 'reports' | 'settings'>('overview');

  // Get current path to determine active tab
  const getCurrentTab = () => {
    if (location.pathname === '/admin/products') return 'products';
    if (location.pathname === '/admin/orders') return 'orders';
    if (location.pathname === '/admin/appointments') return 'appointments';
    if (location.pathname === '/admin/reports') return 'reports';
    if (location.pathname === '/admin/settings') return 'settings';
    return 'overview';
  };

  const currentTab = getCurrentTab();

  const renderContent = () => {
    switch (currentTab) {
      case 'products':
        return <AdminProducts />;
      case 'orders':
        return <AdminOrders />;
      case 'appointments':
        return <AdminAppointments />;
      case 'reports':
        return <AdminReports />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your auto parts store</p>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Products</p>
              <p className="text-3xl font-bold mt-2">0</p>
            </div>
            <Package className="h-12 w-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Total Orders</p>
              <p className="text-3xl font-bold mt-2">0</p>
            </div>
            <ListOrdered className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Customers</p>
              <p className="text-3xl font-bold mt-2">0</p>
            </div>
            <Users className="h-12 w-12 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Appointments</p>
              <p className="text-3xl font-bold mt-2">0</p>
            </div>
            <Calendar className="h-12 w-12 text-orange-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="text-center py-8">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No recent activity</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => window.location.hash = '#/admin/products'} 
              className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-sm transition"
            >
              <Package className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Products</span>
            </button>
            
            <button 
              onClick={() => window.location.hash = '#/admin/orders'} 
              className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-sm transition"
            >
              <ListOrdered className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Orders</span>
            </button>
            
            <button 
              onClick={() => window.location.hash = '#/admin/appointments'} 
              className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-sm transition"
            >
              <Calendar className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Appointments</span>
            </button>
            
            <button 
              onClick={() => window.location.hash = '#/admin/reports'} 
              className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-sm transition"
            >
              <BarChart3 className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}