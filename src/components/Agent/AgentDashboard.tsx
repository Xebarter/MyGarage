import React from 'react';
import { Link } from 'react-router-dom';

const AgentDashboard: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Agent Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Manage Admins</h2>
          <p className="text-gray-600 mb-4">View and manage administrators under your supervision</p>
          <Link 
            to="/agent/admins" 
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
          >
            View Admins
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Manage Repair Shops</h2>
          <p className="text-gray-600 mb-4">Oversee repair shops and mechanics in your jurisdiction</p>
          <Link 
            to="/agent/repair-shops" 
            className="inline-block bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition"
          >
            View Repair Shops
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Reports & Analytics</h2>
          <p className="text-gray-600 mb-4">View performance metrics and reports</p>
          <Link 
            to="/agent/reports" 
            className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded transition"
          >
            View Reports
          </Link>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <ul className="space-y-3">
          <li className="border-b pb-3">
            <p className="font-medium">New admin account created</p>
            <p className="text-sm text-gray-500">Today, 10:30 AM</p>
          </li>
          <li className="border-b pb-3">
            <p className="font-medium">Repair shop verification completed</p>
            <p className="text-sm text-gray-500">Yesterday, 3:45 PM</p>
          </li>
          <li className="border-b pb-3">
            <p className="font-medium">Monthly report generated</p>
            <p className="text-sm text-gray-500">Yesterday, 11:20 AM</p>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AgentDashboard;