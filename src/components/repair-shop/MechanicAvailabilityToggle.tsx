import { useState, useEffect } from 'react';
import { supabase, RepairShop } from '../../lib/supabase';
import { ToggleLeft, ToggleRight, User, Clock, MapPin } from 'lucide-react';

interface MechanicAvailabilityToggleProps {
  repairShop: RepairShop;
  onUpdate?: (status: 'available' | 'busy' | 'offline') => void;
}

export function MechanicAvailabilityToggle({ repairShop, onUpdate }: MechanicAvailabilityToggleProps) {
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'busy' | 'offline'>(repairShop.availability_status || 'offline');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setAvailabilityStatus(repairShop.availability_status || 'offline');
  }, [repairShop.availability_status]);

  const handleStatusChange = async (newStatus: 'available' | 'busy' | 'offline') => {
    if (availabilityStatus === newStatus) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('repair_shops')
        .update({ 
          availability_status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', repairShop.id);

      if (error) throw error;

      setAvailabilityStatus(newStatus);
      if (onUpdate) {
        onUpdate(newStatus);
      }
    } catch (err) {
      console.error('Error updating availability status:', err);
      alert('Failed to update availability status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = () => {
    switch (availabilityStatus) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (availabilityStatus) {
      case 'available': return 'Available';
      case 'busy': return 'Busy';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <User className="mr-2" />
        Mechanic Status
      </h3>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor()}`}></div>
          <span className="font-medium">{getStatusText()}</span>
        </div>
        <span className="text-sm text-gray-500">Current Status</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleStatusChange('available')}
          disabled={updating}
          className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all ${
            availabilityStatus === 'available'
              ? 'bg-green-100 border-2 border-green-500'
              : 'bg-gray-100 hover:bg-gray-200 border-2 border-transparent'
          }`}
        >
          <ToggleRight className={`w-6 h-6 ${availabilityStatus === 'available' ? 'text-green-600' : 'text-gray-400'}`} />
          <span className="mt-1 text-sm font-medium">Available</span>
        </button>
        
        <button
          onClick={() => handleStatusChange('busy')}
          disabled={updating}
          className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all ${
            availabilityStatus === 'busy'
              ? 'bg-yellow-100 border-2 border-yellow-500'
              : 'bg-gray-100 hover:bg-gray-200 border-2 border-transparent'
          }`}
        >
          <Clock className={`w-6 h-6 ${availabilityStatus === 'busy' ? 'text-yellow-600' : 'text-gray-400'}`} />
          <span className="mt-1 text-sm font-medium">Busy</span>
        </button>
        
        <button
          onClick={() => handleStatusChange('offline')}
          disabled={updating}
          className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all ${
            availabilityStatus === 'offline'
              ? 'bg-red-100 border-2 border-red-500'
              : 'bg-gray-100 hover:bg-gray-200 border-2 border-transparent'
          }`}
        >
          <ToggleLeft className={`w-6 h-6 ${availabilityStatus === 'offline' ? 'text-red-600' : 'text-gray-400'}`} />
          <span className="mt-1 text-sm font-medium">Offline</span>
        </button>
      </div>
      
      {updating && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Updating status...
        </div>
      )}
    </div>
  );
}