import React, { useState } from 'react';

interface Admin {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
}

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@example.com',
      status: 'active',
      lastLogin: '2025-11-30 14:30'
    },
    {
      id: 2,
      name: 'Emma Johnson',
      email: 'emma.j@example.com',
      status: 'active',
      lastLogin: '2025-12-01 09:15'
    },
    {
      id: 3,
      name: 'Michael Brown',
      email: 'm.brown@example.com',
      status: 'pending',
      lastLogin: 'Never'
    }
  ]);

  const handleStatusChange = (id: number, status: Admin['status']) => {
    setAdmins(admins.map(admin => 
      admin.id === id ? { ...admin, status } : admin
    ));
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Management</h1>
      
      <div className="mb-6">
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
          Add New Admin
        </button>
      </div>
      
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{admin.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    admin.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : admin.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {admin.lastLogin}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                    Edit
                  </button>
                  <select 
                    value={admin.status}
                    onChange={(e) => handleStatusChange(admin.id, e.target.value as Admin['status'])}
                    className="text-sm rounded border-gray-300"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
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

export default AdminManagement;