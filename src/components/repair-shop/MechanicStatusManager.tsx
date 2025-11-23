import { useState } from 'react';
import { RepairShop } from '../../lib/supabase';
import { MechanicAvailabilityToggle } from './MechanicAvailabilityToggle';
import { LiveLocationTracker } from './LiveLocationTracker';

interface MechanicStatusManagerProps {
  repairShop: RepairShop;
  onUpdate?: () => void;
}

export function MechanicStatusManager({ repairShop, onUpdate }: MechanicStatusManagerProps) {
  const [localRepairShop, setLocalRepairShop] = useState(repairShop);

  const handleAvailabilityUpdate = (status: 'available' | 'busy' | 'offline') => {
    setLocalRepairShop({
      ...localRepairShop,
      availability_status: status
    });
    
    if (onUpdate) {
      onUpdate();
    }
  };

  const handleLocationUpdate = (latitude: number, longitude: number) => {
    setLocalRepairShop({
      ...localRepairShop,
      latitude,
      longitude
    });
    
    if (onUpdate) {
      onUpdate();
    }
  };

  return (
    <div className="space-y-6">
      <MechanicAvailabilityToggle 
        repairShop={localRepairShop} 
        onUpdate={handleAvailabilityUpdate} 
      />
      
      <LiveLocationTracker 
        repairShop={localRepairShop} 
        onUpdate={handleLocationUpdate} 
      />
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">How It Works</h4>
        <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
          <li>Set your availability status to appear in customer searches</li>
          <li>Enable live location tracking to improve dispatch accuracy</li>
          <li>Customers can see your real-time status on the map</li>
          <li>Status updates help optimize customer matching and dispatching</li>
        </ul>
      </div>
    </div>
  );
}