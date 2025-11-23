import { useState, useEffect } from 'react';
import { supabase, Vehicle } from '../../lib/supabase';
import { Plus, Car, Edit3, Trash2, Save, X } from 'lucide-react';

interface VehicleFormData {
  make: string;
  model: string;
  year: string;
  vin: string;
  mileage: string;
  license_plate: string;
  color: string;
  notes: string;
}

export function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>({
    make: '',
    model: '',
    year: '',
    vin: '',
    mileage: '',
    license_plate: '',
    color: '',
    notes: ''
  });
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
    createOrGetCustomer();
  }, []);

  async function createOrGetCustomer() {
    // In a real app, you would associate this with the logged-in user
    // For now, we'll create a generic customer or use local storage to simulate
    const storedCustomerId = localStorage.getItem('customer_id');
    
    if (storedCustomerId) {
      setCustomerId(storedCustomerId);
      return;
    }
    
    const { data, error } = await supabase
      .from('customers')
      .insert([
        {
          name: 'General User',
          email: 'user@example.com',
          phone: '+1234567890'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
    } else {
      setCustomerId(data.id);
      localStorage.setItem('customer_id', data.id);
    }
  }

  async function fetchVehicles() {
    const storedCustomerId = localStorage.getItem('customer_id');
    if (!storedCustomerId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', storedCustomerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vehicles:', error);
    } else {
      setVehicles(data || []);
    }
    setLoading(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function startEditing(vehicle: Vehicle) {
    setEditingId(vehicle.id);
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year.toString(),
      vin: vehicle.vin || '',
      mileage: vehicle.mileage?.toString() || '',
      license_plate: vehicle.license_plate || '',
      color: vehicle.color || '',
      notes: vehicle.notes || ''
    });
  }

  function cancelEditing() {
    setEditingId(null);
    resetForm();
  }

  function resetForm() {
    setFormData({
      make: '',
      model: '',
      year: '',
      vin: '',
      mileage: '',
      license_plate: '',
      color: '',
      notes: ''
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!customerId) return;

    const vehicleData = {
      customer_id: customerId,
      make: formData.make,
      model: formData.model,
      year: parseInt(formData.year) || 0,
      vin: formData.vin || null,
      mileage: formData.mileage ? parseInt(formData.mileage) : null,
      license_plate: formData.license_plate || null,
      color: formData.color || null,
      notes: formData.notes || null
    };

    if (editingId) {
      // Update existing vehicle
      const { error } = await supabase
        .from('vehicles')
        .update(vehicleData)
        .eq('id', editingId);

      if (error) {
        console.error('Error updating vehicle:', error);
      } else {
        setEditingId(null);
        resetForm();
        fetchVehicles();
      }
    } else {
      // Create new vehicle
      const { error } = await supabase
        .from('vehicles')
        .insert([vehicleData]);

      if (error) {
        console.error('Error adding vehicle:', error);
      } else {
        resetForm();
        fetchVehicles();
      }
    }
  }

  async function deleteVehicle(id: string) {
    const confirmed = confirm('Are you sure you want to delete this vehicle?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
    } else {
      fetchVehicles();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">My Vehicles</h2>
        <p className="text-slate-600">Manage your vehicles and track service history</p>
      </div>

      {/* Add/Edit Vehicle Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">
          {editingId ? 'Edit Vehicle' : 'Add New Vehicle'}
        </h3>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="make" className="block text-sm font-medium text-slate-700 mb-1">
              Make *
            </label>
            <input
              type="text"
              id="make"
              name="make"
              value={formData.make}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., Toyota"
            />
          </div>

          <div>
            <label htmlFor="model" className="block text-sm font-medium text-slate-700 mb-1">
              Model *
            </label>
            <input
              type="text"
              id="model"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., Camry"
            />
          </div>

          <div>
            <label htmlFor="year" className="block text-sm font-medium text-slate-700 mb-1">
              Year *
            </label>
            <input
              type="number"
              id="year"
              name="year"
              value={formData.year}
              onChange={handleInputChange}
              required
              min="1900"
              max={new Date().getFullYear() + 1}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., 2020"
            />
          </div>

          <div>
            <label htmlFor="vin" className="block text-sm font-medium text-slate-700 mb-1">
              VIN
            </label>
            <input
              type="text"
              id="vin"
              name="vin"
              value={formData.vin}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Vehicle Identification Number"
            />
          </div>

          <div>
            <label htmlFor="mileage" className="block text-sm font-medium text-slate-700 mb-1">
              Mileage
            </label>
            <input
              type="number"
              id="mileage"
              name="mileage"
              value={formData.mileage}
              onChange={handleInputChange}
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Current mileage"
            />
          </div>

          <div>
            <label htmlFor="license_plate" className="block text-sm font-medium text-slate-700 mb-1">
              License Plate
            </label>
            <input
              type="text"
              id="license_plate"
              name="license_plate"
              value={formData.license_plate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="License plate number"
            />
          </div>

          <div>
            <label htmlFor="color" className="block text-sm font-medium text-slate-700 mb-1">
              Color
            </label>
            <input
              type="text"
              id="color"
              name="color"
              value={formData.color}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Vehicle color"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Additional notes about the vehicle"
            ></textarea>
          </div>

          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
            
            {editingId && (
              <button
                type="button"
                onClick={cancelEditing}
                className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Vehicle List */}
      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Registered Vehicles</h3>
        
        {vehicles.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <Car className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-slate-900 mb-2">No vehicles registered</h4>
            <p className="text-slate-600 mb-4">Add your first vehicle to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg text-slate-900">
                        {vehicle.make} {vehicle.model}
                      </h4>
                      <p className="text-slate-600">Year: {vehicle.year}</p>
                    </div>
                    <Car className="w-8 h-8 text-orange-500" />
                  </div>

                  <div className="space-y-2 text-sm">
                    {vehicle.vin && (
                      <p className="flex justify-between">
                        <span className="text-slate-600">VIN:</span>
                        <span className="font-medium">{vehicle.vin}</span>
                      </p>
                    )}
                    
                    {vehicle.mileage && (
                      <p className="flex justify-between">
                        <span className="text-slate-600">Mileage:</span>
                        <span className="font-medium">{vehicle.mileage.toLocaleString()} miles</span>
                      </p>
                    )}
                    
                    {(vehicle.license_plate || vehicle.color) && (
                      <p className="flex justify-between">
                        <span className="text-slate-600">
                          {vehicle.license_plate && vehicle.color 
                            ? 'Plate / Color:' 
                            : vehicle.license_plate 
                              ? 'License Plate:' 
                              : 'Color:'}
                        </span>
                        <span className="font-medium">
                          {[vehicle.license_plate, vehicle.color].filter(Boolean).join(' / ')}
                        </span>
                      </p>
                    )}
                  </div>

                  {vehicle.notes && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-sm text-slate-600">{vehicle.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => startEditing(vehicle)}
                      className="flex items-center gap-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-3 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteVehicle(vehicle.id)}
                      className="flex items-center gap-1 text-sm bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 px-3 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}