import { useState } from 'react';
import { Car, Plus, Edit, Trash2, Wrench, Calendar, AlertTriangle, ArrowLeft } from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  vin: string;
  mileage: number;
  lastService?: string;
  nextService?: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
}

interface MyVehiclesProps {
  onBack?: () => void;
}

export function MyVehicles({ onBack }: MyVehiclesProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: '1',
      make: 'Toyota',
      model: 'Camry',
      year: 2018,
      color: 'Silver',
      licensePlate: 'ABC123',
      vin: '1HGBH41JXMN109186',
      mileage: 45000,
      lastService: '2023-06-15',
      nextService: '2023-09-15',
      insuranceExpiry: '2023-09-22',
      registrationExpiry: '2024-01-15'
    },
    {
      id: '2',
      make: 'Honda',
      model: 'Civic',
      year: 2020,
      color: 'Blue',
      licensePlate: 'XYZ789',
      vin: '2HGFC2F59MH123456',
      mileage: 22000,
      lastService: '2023-05-20',
      nextService: '2023-08-20',
      insuranceExpiry: '2023-07-15',
      registrationExpiry: '2024-05-10'
    }
  ]);

  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const handleDeleteVehicle = (id: string) => {
    if (confirm('Are you sure you want to remove this vehicle?')) {
      setVehicles(vehicles.filter(vehicle => vehicle.id !== id));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const isExpiringSoon = (dateString?: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    return date <= thirtyDaysFromNow;
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
        <h1 className="text-2xl font-bold text-gray-900">My Vehicles</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Vehicle Management</h2>
              <p className="text-slate-600 text-sm">
                Add, edit, or remove your vehicles
              </p>
            </div>
            <button 
              onClick={() => setShowAddVehicle(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Vehicle
            </button>
          </div>
        </div>

        {/* Vehicles List */}
        <div className="divide-y divide-slate-200">
          {vehicles.length === 0 ? (
            <div className="text-center py-12">
              <Car className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No vehicles added</h3>
              <p className="mt-1 text-sm text-slate-500">
                Get started by adding your first vehicle.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddVehicle(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </button>
              </div>
            </div>
          ) : (
            vehicles.map((vehicle) => (
              <div key={vehicle.id} className="px-6 py-5 hover:bg-slate-50 transition">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="bg-orange-100 w-16 h-16 rounded-lg flex items-center justify-center">
                      <Car className="text-orange-600 w-8 h-8" />
                    </div>
                  </div>
                  
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-slate-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {vehicle.color}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {vehicle.licensePlate}
                          </span>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center text-sm text-slate-600">
                            <Wrench className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            Mileage: {vehicle.mileage.toLocaleString()} miles
                          </div>
                          
                          <div className="flex items-center text-sm text-slate-600">
                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            VIN: {vehicle.vin}
                          </div>
                          
                          <div className="flex items-center text-sm">
                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            <span>Last Service: {formatDate(vehicle.lastService)}</span>
                          </div>
                          
                          <div className="flex items-center text-sm">
                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            <span>Next Service: {formatDate(vehicle.nextService)}</span>
                          </div>
                          
                          <div className={`flex items-center text-sm ${isExpiringSoon(vehicle.insuranceExpiry) ? 'text-orange-600' : 'text-slate-600'}`}>
                            <AlertTriangle className={`flex-shrink-0 mr-1.5 h-4 w-4 ${isExpiringSoon(vehicle.insuranceExpiry) ? 'text-orange-500' : 'text-slate-400'}`} />
                            <span>Insurance: {formatDate(vehicle.insuranceExpiry)}</span>
                            {isExpiringSoon(vehicle.insuranceExpiry) && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Expiring Soon
                              </span>
                            )}
                          </div>
                          
                          <div className={`flex items-center text-sm ${isExpiringSoon(vehicle.registrationExpiry) ? 'text-orange-600' : 'text-slate-600'}`}>
                            <AlertTriangle className={`flex-shrink-0 mr-1.5 h-4 w-4 ${isExpiringSoon(vehicle.registrationExpiry) ? 'text-orange-500' : 'text-slate-400'}`} />
                            <span>Registration: {formatDate(vehicle.registrationExpiry)}</span>
                            {isExpiringSoon(vehicle.registrationExpiry) && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Expiring Soon
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button 
                          onClick={() => setEditingVehicle(vehicle)}
                          className="p-2 rounded-full hover:bg-slate-100"
                        >
                          <Edit className="h-4 w-4 text-slate-500" />
                        </button>
                        <button 
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          className="p-2 rounded-full hover:bg-slate-100"
                        >
                          <Trash2 className="h-4 w-4 text-slate-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Vehicle Modal */}
      {(showAddVehicle || editingVehicle) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h3>
            
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Make
                  </label>
                  <input
                    type="text"
                    defaultValue={editingVehicle?.make || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    defaultValue={editingVehicle?.model || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    defaultValue={editingVehicle?.year || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    defaultValue={editingVehicle?.color || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    License Plate
                  </label>
                  <input
                    type="text"
                    defaultValue={editingVehicle?.licensePlate || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    VIN
                  </label>
                  <input
                    type="text"
                    defaultValue={editingVehicle?.vin || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Current Mileage
                </label>
                <input
                  type="number"
                  defaultValue={editingVehicle?.mileage || ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddVehicle(false);
                    setEditingVehicle(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                >
                  {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}