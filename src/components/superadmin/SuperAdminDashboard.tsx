import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  Wrench,
  Shield,
  BarChart3, 
  Settings,
  LogOut,
  UserCheck
} from 'lucide-react';
import { SuperAdminHeader } from './SuperAdminHeader';
import { UserManagement } from './UserManagement';
import { RepairShopManagement } from './RepairShopManagement';
import { AdminManagement } from './AdminManagement';
import { SuperAdminReports } from './SuperAdminReports';

export function SuperAdminDashboard() {
  const location = useLocation();
  
  const getCurrentTab = () => {
    if (location.pathname === '/superadmin/users') return 'users';
    if (location.pathname === '/superadmin/shops') return 'shops';
    if (location.pathname === '/superadmin/admins') return 'admins';
    if (location.pathname === '/superadmin/reports') return 'reports';
    if (location.pathname === '/superadmin/settings') return 'settings';
    return 'overview';
  };

  const currentTab = getCurrentTab();

  const renderContent = () => {
    switch (currentTab) {
      case 'users':
        return <UserManagement />;
      case 'shops':
        return <RepairShopManagement />;
      case 'admins':
        return <AdminManagement />;
      case 'reports':
        return <SuperAdminReports />;
      case 'settings':
        // Placeholder for settings component
        return <div>Settings Component</div>;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminHeader />
      
      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage users, repair shops, and admins</p>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Overview</h3>
        <p className="text-gray-600">Welcome to the Super Admin Dashboard. Here you can manage all aspects of the platform.</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <ul className="space-y-2 text-gray-600">
          <li>• Manage Users</li>
          <li>• Manage Repair Shops</li>
          <li>• Manage Admins</li>
          <li>• View Reports</li>
        </ul>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
        <p className="text-gray-600">View detailed reports and analytics in the Reports section.</p>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
