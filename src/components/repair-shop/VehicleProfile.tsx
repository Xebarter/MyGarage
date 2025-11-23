import { useState } from 'react';
import { 
  Car, 
  Calendar, 
  Wrench,
  Edit,
  Save,
  X,
  Plus
} from 'lucide-react';
import { supabase, Vehicle } from '../../lib/supabase';

interface VehicleProfileProps {
  vehicle?: Vehicle;
  customerId: string;
  onSave: (vehicle: Vehicle) => void;
  onCancel: () => void;
}

export function VehicleProfile({ vehicle, customerId, onSave, onCancel }: VehicleProfileProps) {
  const [formData, setFormData] = useState<Partial<Vehicle>>(vehicle || {
    customer_id: customerId,
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    license_plate: '',
    color: '',
    mileage: 0,
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof Vehicle, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const vehicleData = {
        ...formData,
        customer_id: customerId,
        updated_at: new Date().toISOString()
      };
      
      if (vehicle) {
        // Update existing vehicle
        const { data, error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', vehicle.id)
          .select()
          .single();
          
        if (error) throw error;
        onSave(data);
      } else {
        // Create new vehicle
        const { data, error } = await supabase
          .from('vehicles')
          .insert([{ ...vehicleData, created_at: new Date().toISOString() }])
          .select()
          .single();
          
        if (error) throw error;
        onSave(data);
      }
    } catch (err) {
      console.error('Error saving vehicle:', err);
      alert('Failed to save vehicle information');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Car className="mr-2" />
          {vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
        </h2>
        <button 
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
            <input
              type="text"
              required
              value={formData.make || ''}
              onChange={(e) => handleChange('make', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              placeholder="e.g., Toyota"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
            <input
              type="text"
              required
              value={formData.model || ''}
              onChange={(e) => handleChange('model', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              placeholder="e.g., Camry"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
            <input
              type="number"
              required
              min="1900"
              max={new Date().getFullYear() + 1}
              value={formData.year || ''}
              onChange={(e) => handleChange('year', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
            <input
              type="text"
              value={formData.vin || ''}
              onChange={(e) => handleChange('vin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              placeholder="Vehicle Identification Number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
            <input
              type="text"
              value={formData.license_plate || ''}
              onChange={(e) => handleChange('license_plate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              placeholder="License plate number"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="text"
              value={formData.color || ''}
              onChange={(e) => handleChange('color', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              placeholder="Vehicle color"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Mileage</label>
            <input
              type="number"
              value={formData.mileage || ''}
              onChange={(e) => handleChange('mileage', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              placeholder="Current mileage"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Service Date</label>
            <input
              type="date"
              value={formData.last_service_date ? formData.last_service_date.split('T')[0] : ''}
              onChange={(e) => handleChange('last_service_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Service Due</label>
            <input
              type="date"
              value={formData.next_service_due ? formData.next_service_due.split('T')[0] : ''}
              onChange={(e) => handleChange('next_service_due', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            placeholder="Special notes about this vehicle"
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {vehicle ? 'Update Vehicle' : 'Add Vehicle'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}