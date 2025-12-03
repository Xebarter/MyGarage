import { useState } from 'react';
import { Calendar, Car, Wrench, MapPin, Clock, CheckCircle, ArrowLeft } from 'lucide-react';

interface ServiceRecord {
  id: string;
  date: string;
  serviceName: string;
  vehicle: string;
  shop: string;
  cost: number;
  status: 'completed' | 'in-progress' | 'scheduled';
  nextServiceDate?: string;
}

interface ServiceHistoryProps {
  onBack?: () => void;
}

export function ServiceHistory({ onBack }: ServiceHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress' | 'scheduled'>('all');
  
  // Mock data
  const serviceRecords: ServiceRecord[] = [
    {
      id: '1',
      date: '2023-06-15',
      serviceName: 'Oil Change',
      vehicle: 'Toyota Camry 2018',
      shop: 'AutoCare Service Center',
      cost: 45.99,
      status: 'completed',
      nextServiceDate: '2023-09-15'
    },
    {
      id: '2',
      date: '2023-05-20',
      serviceName: 'Tire Replacement',
      vehicle: 'Toyota Camry 2018',
      shop: 'TireMaster Shop',
      cost: 320.50,
      status: 'completed'
    },
    {
      id: '3',
      date: '2023-07-10',
      serviceName: 'Brake Inspection',
      vehicle: 'Honda Civic 2020',
      shop: 'Brake Experts',
      cost: 89.99,
      status: 'in-progress'
    },
    {
      id: '4',
      date: '2023-07-25',
      serviceName: 'Engine Diagnostic',
      vehicle: 'Honda Civic 2020',
      shop: 'AutoCare Service Center',
      cost: 125.00,
      status: 'scheduled'
    },
    {
      id: '5',
      date: '2023-04-05',
      serviceName: 'Transmission Service',
      vehicle: 'Toyota Camry 2018',
      shop: 'GearShift Auto',
      cost: 250.75,
      status: 'completed',
      nextServiceDate: '2023-10-05'
    }
  ];

  const filteredRecords = filter === 'all' 
    ? serviceRecords 
    : serviceRecords.filter(record => record.status === filter);

  const getStatusColor = (status: ServiceRecord['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: ServiceRecord['status']) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'scheduled': return 'Scheduled';
      default: return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center mb-6">
        {onBack && (
          <button 
            onClick={onBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
            aria-label="Back to profile"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-900">Service History</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Vehicle Service Records</h2>
              <p className="text-slate-600 text-sm">
                Track and manage your vehicle maintenance history
              </p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    filter === 'all'
                      ? 'bg-orange-100 text-orange-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    filter === 'completed'
                      ? 'bg-green-100 text-green-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setFilter('in-progress')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    filter === 'in-progress'
                      ? 'bg-yellow-100 text-yellow-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => setFilter('scheduled')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    filter === 'scheduled'
                      ? 'bg-blue-100 text-blue-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Scheduled
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Service Records List */}
        <div className="divide-y divide-slate-200">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No service records</h3>
              <p className="mt-1 text-sm text-slate-500">
                You don't have any service records matching your filter.
              </p>
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div key={record.id} className="px-6 py-5 hover:bg-slate-50 transition">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <div className="bg-orange-100 p-2 rounded-lg mr-4">
                        <Wrench className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="flex items-center flex-wrap">
                          <h3 className="text-base font-medium text-slate-900">{record.serviceName}</h3>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                            {getStatusText(record.status)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-4">
                          <div className="flex items-center text-sm text-slate-500 mt-1 sm:mt-0">
                            <Car className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            {record.vehicle}
                          </div>
                          <div className="flex items-center text-sm text-slate-500 mt-1 sm:mt-0">
                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            {new Date(record.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-sm text-slate-500 mt-1 sm:mt-0">
                            <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            {record.shop}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0 flex flex-col items-end">
                    <p className="text-lg font-medium text-slate-900">${record.cost.toFixed(2)}</p>
                    {record.nextServiceDate && (
                      <div className="flex items-center text-sm text-slate-500 mt-1">
                        <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                        Next: {new Date(record.nextServiceDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats Section */}
        <div className="px-6 py-5 bg-slate-50 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-lg mr-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Completed Services</p>
                  <p className="text-xl font-semibold">
                    {serviceRecords.filter(r => r.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Spent</p>
                  <p className="text-xl font-semibold">
                    ${serviceRecords.reduce((sum, record) => sum + record.cost, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex items-center">
                <div className="bg-purple-100 p-2 rounded-lg mr-3">
                  <Car className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Vehicles Serviced</p>
                  <p className="text-xl font-semibold">
                    {[...new Set(serviceRecords.map(r => r.vehicle))].length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}