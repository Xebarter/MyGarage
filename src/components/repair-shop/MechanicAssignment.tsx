import { useState, useEffect } from 'react';
import { User, Wrench } from 'lucide-react';
import { Mechanic } from '../../types/mechanic';
import { getAvailableMechanics, assignMechanicToAppointment } from '../../lib/api/mechanics';

interface Props {
  appointmentId: string;
  repairShopId: string;
  currentMechanic?: Mechanic;
  onAssign: () => void;
}

export function MechanicAssignment({ appointmentId, repairShopId, currentMechanic, onAssign }: Props) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<string>(currentMechanic?.id || '');

  useEffect(() => {
    loadAvailableMechanics();
  }, [repairShopId]);

  const loadAvailableMechanics = async () => {
    try {
      setLoading(true);
      // For simplicity, we're checking availability for today
      // In a real app, you'd check for the appointment date
      const date = new Date().toISOString().split('T')[0];
      const data = await getAvailableMechanics(repairShopId, date);
      setMechanics(data);
    } catch (error) {
      console.error('Error loading mechanics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMechanic = async () => {
    if (!selectedMechanic) return;
    
    try {
      setAssigning(true);
      await assignMechanicToAppointment(appointmentId, selectedMechanic);
      onAssign();
    } catch (error) {
      console.error('Error assigning mechanic:', error);
      alert('Failed to assign mechanic');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
        <span className="ml-2 text-gray-600">Loading mechanics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="mechanic-select" className="block text-sm font-medium text-gray-700 mb-1">
          Assign Mechanic
        </label>
        <div className="flex space-x-2">
          <select
            id="mechanic-select"
            value={selectedMechanic}
            onChange={(e) => setSelectedMechanic(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
          >
            <option value="">Select a mechanic</option>
            {mechanics.map((mechanic) => (
              <option key={mechanic.id} value={mechanic.id}>
                {mechanic.first_name} {mechanic.last_name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssignMechanic}
            disabled={!selectedMechanic || assigning}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none disabled:opacity-50"
          >
            {assigning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Assigning...
              </>
            ) : (
              'Assign'
            )}
          </button>
        </div>
      </div>

      {currentMechanic && (
        <div className="bg-blue-50 rounded-md p-3">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              {currentMechanic.profile_image_url ? (
                <img 
                  src={currentMechanic.profile_image_url} 
                  alt={`${currentMechanic.first_name} ${currentMechanic.last_name}`}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <User className="h-5 w-5 text-gray-600" />
              )}
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">
                Assigned to {currentMechanic.first_name} {currentMechanic.last_name}
              </h4>
              <p className="text-sm text-gray-500">
                {currentMechanic.specializations.join(', ') || 'Mechanic'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}