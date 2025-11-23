import { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Car, 
  Wrench, 
  Calendar, 
  Edit, 
  Save, 
  X,
  StickyNote,
  Plus
} from 'lucide-react';
import { supabase, Customer, Vehicle, Appointment } from '../../lib/supabase';
import { VehicleProfile } from './VehicleProfile';

interface CustomerProfileProps {
  customerId: string;
  onClose: () => void;
  onCustomerUpdate?: () => void;
}

export function CustomerProfile({ customerId, onClose, onCustomerUpdate }: CustomerProfileProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [saving, setSaving] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    fetchCustomerData();
  }, [customerId]);

  async function fetchCustomerData() {
    try {
      setLoading(true);
      
      // Fetch customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;
      
      // Fetch customer vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('customer_id', customerId);

      if (vehiclesError) throw vehiclesError;
      
      // Fetch customer appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .or(`customer_name.eq.${customerData.name},customer_email.eq.${customerData.email}`)
        .order('appointment_date', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      setCustomer(customerData);
      setEditForm(customerData);
      setVehicles(vehiclesData || []);
      setAppointments(appointmentsData || []);
    } catch (err) {
      console.error('Error fetching customer data:', err);
      alert('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit() {
    setEditing(true);
    setEditForm(customer || {});
  }

  function handleCancelEdit() {
    setEditing(false);
    setEditForm(customer || {});
  }

  async function handleSave() {
    if (!customer) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          address: editForm.address,
          notes: editForm.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (error) throw error;

      setCustomer({ ...customer, ...editForm } as Customer);
      setEditing(false);
      
      if (onCustomerUpdate) {
        onCustomerUpdate();
      }
    } catch (err) {
      console.error('Error updating customer:', err);
      alert('Failed to update customer');
    } finally {
      setSaving(false);
    }
  }

  function handleAddVehicle() {
    setAddingVehicle(true);
  }

  function handleEditVehicle(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
  }

  function handleVehicleSave(vehicle: Vehicle) {
    // Update the vehicles list
    if (editingVehicle) {
      // Update existing vehicle
      setVehicles(vehicles.map(v => v.id === vehicle.id ? vehicle : v));
    } else {
      // Add new vehicle
      setVehicles([...vehicles, vehicle]);
    }
    
    // Reset vehicle editing states
    setAddingVehicle(false);
    setEditingVehicle(null);
  }

  function handleVehicleCancel() {
    setAddingVehicle(false);
    setEditingVehicle(null);
  }

  if (addingVehicle || editingVehicle) {
    return (
      <VehicleProfile
        vehicle={editingVehicle || undefined}
        customerId={customerId}
        onSave={handleVehicleSave}
        onCancel={handleVehicleCancel}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <User className="mr-2" />
          Customer Profile
        </h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Customer Info */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={editForm.address || ''}
                onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={editForm.notes || ''}
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{customer.name}</h3>
                <div className="mt-2 space-y-1">
                  {customer.email && (
                    <p className="flex items-center text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {customer.email}
                    </p>
                  )}
                  {customer.phone && (
                    <p className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {customer.phone}
                    </p>
                  )}
                  {customer.address && (
                    <p className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {customer.address}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleEdit}
                className="flex items-center px-3 py-2 text-sm text-orange-600 hover:text-orange-800"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </button>
            </div>
            
            {customer.notes && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <StickyNote className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Mechanic Notes</h4>
                    <p className="text-sm text-yellow-700 mt-1">{customer.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vehicles */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Car className="mr-2" />
            Vehicles
          </h3>
          <button
            onClick={handleAddVehicle}
            className="flex items-center px-3 py-1 text-sm text-orange-600 hover:text-orange-800"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Vehicle
          </button>
        </div>
        
        {vehicles.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <Car className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">No vehicles registered for this customer</p>
            <button
              onClick={handleAddVehicle}
              className="mt-3 inline-flex items-center px-3 py-1 text-sm text-orange-600 hover:text-orange-800"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add First Vehicle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md">
                <div className="flex justify-between">
                  <h4 className="font-medium text-gray-900">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h4>
                  <button
                    onClick={() => handleEditVehicle(vehicle)}
                    className="text-sm text-orange-600 hover:text-orange-800"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  {vehicle.license_plate && (
                    <p><span className="font-medium">License Plate:</span> {vehicle.license_plate}</p>
                  )}
                  {vehicle.vin && (
                    <p><span className="font-medium">VIN:</span> {vehicle.vin}</p>
                  )}
                  {vehicle.mileage && (
                    <p><span className="font-medium">Mileage:</span> {vehicle.mileage.toLocaleString()} miles</p>
                  )}
                  {vehicle.color && (
                    <p><span className="font-medium">Color:</span> {vehicle.color}</p>
                  )}
                </div>
                
                {(vehicle.last_service_date || vehicle.next_service_due) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-sm">
                    {vehicle.last_service_date && (
                      <div>
                        <p className="text-gray-500">Last Service</p>
                        <p className="font-medium">
                          {new Date(vehicle.last_service_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {vehicle.next_service_due && (
                      <div>
                        <p className="text-gray-500">Next Service Due</p>
                        <p className="font-medium">
                          {new Date(vehicle.next_service_due).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {vehicle.notes && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                    <p className="text-gray-600 italic">{vehicle.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <Wrench className="mr-2" />
          Service History
        </h3>
        
        {appointments.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <Wrench className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">No service history found for this customer</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(appointment.appointment_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {appointment.service_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {appointment.vehicle_year} {appointment.vehicle_make} {appointment.vehicle_model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        appointment.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : appointment.status === 'scheduled' 
                          ? 'bg-blue-100 text-blue-800'
                          : appointment.status === 'in_progress'
                          ? 'bg-indigo-100 text-indigo-800'
                          : appointment.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : appointment.status === 'declined'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}