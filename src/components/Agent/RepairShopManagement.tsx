import React, { useState } from 'react';

interface RepairShop {
  id: number;
  name: string;
  owner: string;
  email: string;
  phone: string;
  address: string;
  status: 'verified' | 'pending' | 'suspended';
  rating: number;
}

const RepairShopManagement: React.FC = () => {
  const [repairShops, setRepairShops] = useState<RepairShop[]>([
    {
      id: 1,
      name: 'AutoTech Repairs',
      owner: 'Robert Davis',
      email: 'contact@autotech.com',
      phone: '+1 (555) 123-4567',
      address: '123 Main St, Cityville',
      status: 'verified',
      rating: 4.7
    },
    {
      id: 2,
      name: 'QuickFix Mechanics',
      owner: 'Sarah Williams',
      email: 'info@quickfix.com',
      phone: '+1 (555) 987-6543',
      address: '456 Oak Ave, Townsburg',
      status: 'pending',
      rating: 0
    },
    {
      id: 3,
      name: 'Premium Auto Care',
      owner: 'James Miller',
      email: 'support@premiumauto.com',
      phone: '+1 (555) 456-7890',
      address: '789 Pine Rd, Villagetown',
      status: 'verified',
      rating: 4.9
    }
  ]);

  const handleStatusChange = (id: number, status: RepairShop['status']) => {
    setRepairShops(repairShops.map(shop => 
      shop.id === id ? { ...shop, status } : shop
    ));
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Repair Shop Management</h1>
      
      <div className="mb-6">
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
          Add New Repair Shop
        </button>
      </div>
      
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shop
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {repairShops.map((shop) => (
              <tr key={shop.id}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{shop.name}</div>
                  <div className="text-sm text-gray-500">{shop.address}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{shop.owner}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500">{shop.email}</div>
                  <div className="text-sm text-gray-500">{shop.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    shop.status === 'verified' 
                      ? 'bg-green-100 text-green-800' 
                      : shop.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {shop.status.charAt(0).toUpperCase() + shop.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {shop.rating > 0 ? `${shop.rating}/5.0` : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                    View
                  </button>
                  <select 
                    value={shop.status}
                    onChange={(e) => handleStatusChange(shop.id, e.target.value as RepairShop['status'])}
                    className="text-sm rounded border-gray-300"
                  >
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RepairShopManagement;