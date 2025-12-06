import React, { useState } from 'react';

const AgentReports: React.FC = () => {
  const [reportType, setReportType] = useState('performance');
  
  // Mock data for charts
  const performanceData = [
    { month: 'Jan', admins: 4, shops: 12 },
    { month: 'Feb', admins: 5, shops: 15 },
    { month: 'Mar', admins: 3, shops: 10 },
    { month: 'Apr', admins: 7, shops: 18 },
    { month: 'May', admins: 6, shops: 20 },
    { month: 'Jun', admins: 8, shops: 22 },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Agent Reports</h1>
      
      <div className="mb-6">
        <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-2">
          Report Type
        </label>
        <select
          id="report-type"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="performance">Performance Overview</option>
          <option value="activity">Activity Summary</option>
          <option value="financial">Financial Report</option>
        </select>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Admin Performance</h2>
          <div className="h-64 flex items-end space-x-2">
            {performanceData.map((data, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="text-xs text-gray-500 mb-1">{data.month}</div>
                <div 
                  className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition"
                  style={{ height: `${data.admins * 10}%` }}
                ></div>
                <div className="text-xs mt-1">{data.admins}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Repair Shop Growth</h2>
          <div className="h-64 flex items-end space-x-2">
            {performanceData.map((data, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="text-xs text-gray-500 mb-1">{data.month}</div>
                <div 
                  className="w-full bg-green-500 rounded-t hover:bg-green-600 transition"
                  style={{ height: `${data.shops * 4}%` }}
                ></div>
                <div className="text-xs mt-1">{data.shops}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Summary Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">24</div>
            <div className="text-gray-600">Total Admins</div>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">68</div>
            <div className="text-gray-600">Total Repair Shops</div>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">142</div>
            <div className="text-gray-600">Active Users</div>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">98%</div>
            <div className="text-gray-600">Satisfaction Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentReports;