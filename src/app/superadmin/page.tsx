import { useState, useEffect } from 'react';
import { 
  Users, 
  Car, 
  Wrench, 
  Package, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye,
  Shield,
  UserCheck,
  LayoutDashboard,
  ListOrdered,
  BarChart3,
  Settings,
  LogOut,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface RepairShop {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  verified: boolean;
  created_at: string;
}

interface Admin {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'shops' | 'admins'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [repairShops, setRepairShops] = useState<RepairShop[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // In a real implementation, you would fetch actual data from your Supabase instance
    // This is a placeholder implementation
    
    // Mock data for demonstration
    const mockUsers: User[] = [
      { id: '1', email: 'john@example.com', created_at: '2023-01-15' },
      { id: '2', email: 'jane@example.com', created_at: '2023-02-20' },
      { id: '3', email: 'bob@example.com', created_at: '2023-03-10' },
    ];
    
    const mockShops: RepairShop[] = [
      { 
        id: '1', 
        name: 'Premium Auto Service', 
        email: 'info@premiumauto.com', 
        phone: '(555) 123-4567',
        address: '123 Main St, Los Angeles, CA',
        verified: true,
        created_at: '2023-01-10'
      },
      { 
        id: '2', 
        name: 'Quick Fix Mechanics', 
        email: 'service@quickfix.com', 
        phone: '(555) 234-5678',
        address: '456 Oak Ave, Los Angeles, CA',
        verified: false,
        created_at: '2023-02-15'
      },
    ];
    
    const mockAdmins: Admin[] = [
      { id: '1', email: 'admin@mygarage.com', role: 'Super Admin', created_at: '2023-01-01' },
      { id: '2', email: 'parts@mygarage.com', role: 'Parts Admin', created_at: '2023-01-05' },
      { id: '3', email: 'services@mygarage.com', role: 'Services Admin', created_at: '2023-01-08' },
    ];
    
    setUsers(mockUsers);
    setRepairShops(mockShops);
    setAdmins(mockAdmins);
    
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Shield className="h-8 w-8 text-orange-600" />
                <h1 className="ml-3 text-xl font-bold text-gray-900">Super Admin Dashboard</h1>
              </div>
              <nav className="ml-6 flex space-x-4">
                <a
                  href="#"
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-orange-600 text-white"
                >
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  Dashboard
                </a>
                <a
                  href="#"
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Package className="h-4 w-4 mr-1" />
                  Products
                </a>
                <a
                  href="#"
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  <ListOrdered className="h-4 w-4 mr-1" />
                  Orders
                </a>
                <a
                  href="#"
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Appointments
                </a>
                <a
                  href="#"
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Reports
                </a>
                <a
                  href="#"
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </a>
              </nav>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Back to Store
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Original Header moved to content area */}
      <div className="bg-white shadow mt-6">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-orange-600" />
            <h1 className="ml-3 text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage users, repair shops, and administrators
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-gray-400" />
                <div className="ml-3">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{users.length}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <Car className="h-6 w-6 text-gray-400" />
                <div className="ml-3">
                  <dt className="text-sm font-medium text-gray-500 truncate">Repair Shops</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{repairShops.length}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <Wrench className="h-6 w-6 text-gray-400" />
                <div className="ml-3">
                  <dt className="text-sm font-medium text-gray-500 truncate">Mechanics</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">24</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <UserCheck className="h-6 w-6 text-gray-400" />
                <div className="ml-3">
                  <dt className="text-sm font-medium text-gray-500 truncate">Admins</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{admins.length}</dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="inline-block h-4 w-4 mr-2" />
                General Public Users
              </button>
              <button
                onClick={() => setActiveTab('shops')}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'shops'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Car className="inline-block h-4 w-4 mr-2" />
                Repair Shops & Mechanics
              </button>
              <button
                onClick={() => setActiveTab('admins')}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'admins'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <UserCheck className="inline-block h-4 w-4 mr-2" />
                Spare Parts Shop Admins
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'users' && (
                <UserManagementTable users={users} />
              )}
              
              {activeTab === 'shops' && (
                <ShopManagementTable shops={repairShops} />
              )}
              
              {activeTab === 'admins' && (
                <AdminManagementTable admins={admins} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UserManagementTable({ users }: { users: User[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="sm:flex sm:items-center px-6 py-4">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-gray-900">General Public Users</h2>
          <p className="mt-2 text-sm text-gray-700">
            List of all registered users in the system
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </button>
        </div>
      </div>
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Registration Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <Users className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-500">ID: {user.id.substring(0, 8)}...</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{user.created_at}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Active
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button className="text-orange-600 hover:text-orange-900 mr-3">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button className="text-red-600 hover:text-red-900">
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShopManagementTable({ shops }: { shops: RepairShop[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="sm:flex sm:items-center px-6 py-4">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-gray-900">Repair Shops & Mechanics</h2>
          <p className="mt-2 text-sm text-gray-700">
            List of all repair shops and their mechanics in the system
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Shop
          </button>
        </div>
      </div>
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Shop
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Address
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {shops.map((shop) => (
            <tr key={shop.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Car className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{shop.name}</div>
                    <div className="text-sm text-gray-500">ID: {shop.id.substring(0, 8)}...</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{shop.email}</div>
                <div className="text-sm text-gray-500">{shop.phone}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {shop.address}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {shop.verified ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Verified
                  </span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button className="text-orange-600 hover:text-orange-900 mr-3">
                  <Eye className="h-4 w-4" />
                </button>
                <button className="text-orange-600 hover:text-orange-900 mr-3">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button className="text-red-600 hover:text-red-900">
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminManagementTable({ admins }: { admins: Admin[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="sm:flex sm:items-center px-6 py-4">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-gray-900">Spare Parts Shop Admins</h2>
          <p className="mt-2 text-sm text-gray-700">
            List of all administrators managing spare parts inventory
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Admin
          </button>
        </div>
      </div>
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Admin
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Registration Date
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {admins.map((admin) => (
            <tr key={admin.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <UserCheck className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{admin.email}</div>
                    <div className="text-sm text-gray-500">ID: {admin.id.substring(0, 8)}...</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{admin.role}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {admin.created_at}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button className="text-orange-600 hover:text-orange-900 mr-3">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button className="text-red-600 hover:text-red-900">
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}