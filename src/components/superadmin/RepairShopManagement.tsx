import { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Eye, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RepairShop {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  verified: boolean;
  created_at: string;
}

export function RepairShopManagement() {
  const [repairShops, setRepairShops] = useState<RepairShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRepairShops();
  }, []);

  async function fetchRepairShops() {
    setLoading(true);
    // In a real implementation, you would fetch actual data from your Supabase instance
    // This is a placeholder implementation
    setTimeout(() => {
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
      setRepairShops(mockShops);
      setLoading(false);
    }, 1000);
  }

  const filteredShops = repairShops.filter(shop =>
    shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleVerification = (id: string) => {
    setRepairShops(shops => 
      shops.map(shop => 
        shop.id === id ? { ...shop, verified: !shop.verified } : shop
      )
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Repair Shop Management</h2>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-5 w-5 mr-2" />
            Add Repair Shop
          </button>
        </div>
        
        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search repair shops..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="overflow-x-auto">
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Loading repair shops...
                </td>
              </tr>
            ) : filteredShops.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No repair shops found
                </td>
              </tr>
            ) : (
              filteredShops.map((shop) => (
                <tr key={shop.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{shop.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{shop.email}</div>
                    <div className="text-sm text-gray-500">{shop.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{shop.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      shop.verified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {shop.verified ? (
                        <>
                          <UserCheck className="h-3 w-3 mr-1" />
                          Verified
                        </>
                      ) : (
                        <>
                          <UserX className="h-3 w-3 mr-1" />
                          Pending
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {shop.created_at}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => toggleVerification(shop.id)}
                        className={`p-1 rounded hover:bg-gray-100 ${
                          shop.verified 
                            ? 'text-yellow-600 hover:text-yellow-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {shop.verified ? (
                          <UserX className="h-5 w-5" />
                        ) : (
                          <UserCheck className="h-5 w-5" />
                        )}
                      </button>
                      <button className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50">
                        <Eye className="h-5 w-5" />
                      </button>
                      <button className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50">
                        <Edit3 className="h-5 w-5" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}