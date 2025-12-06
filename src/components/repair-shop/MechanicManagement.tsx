import { useState, useEffect } from 'react';
import { 
  User, 
  Wrench, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Clock,
  Award,
  Star
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Mechanic, MechanicWorkingHour } from '../../types/mechanic';
import { getMechanicsByRepairShop, createMechanic, updateMechanic, deleteMechanic, getMechanicWorkingHours, upsertMechanicWorkingHours } from '../../lib/api/mechanics';

interface Props {
  repairShopId: string;
}

const daysOfWeek = [
  { id: 0, name: 'Sunday' },
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
];

export function MechanicManagement({ repairShopId }: Props) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [workingHours, setWorkingHours] = useState<Record<string, MechanicWorkingHour[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const [newMechanic, setNewMechanic] = useState<Omit<Mechanic, 'id' | 'created_at' | 'updated_at'> | null>(null);
  const [expandedMechanic, setExpandedMechanic] = useState<string | null>(null);

  useEffect(() => {
    loadMechanics();
  }, [repairShopId]);

  const loadMechanics = async () => {
    try {
      setLoading(true);
      const data = await getMechanicsByRepairShop(repairShopId);
      setMechanics(data);
      
      // Load working hours for each mechanic
      const hoursData: Record<string, MechanicWorkingHour[]> = {};
      for (const mechanic of data) {
        const hours = await getMechanicWorkingHours(mechanic.id);
        hoursData[mechanic.id] = hours;
      }
      setWorkingHours(hoursData);
    } catch (error) {
      console.error('Error loading mechanics:', error);
      alert('Failed to load mechanics');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMechanic = () => {
    setNewMechanic({
      repair_shop_id: repairShopId,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      bio: '',
      certifications: [],
      specializations: [],
      years_of_experience: 0,
      hourly_rate: 0,
      profile_image_url: '',
      is_active: true
    });
  };

  const handleSaveNewMechanic = async () => {
    if (!newMechanic) return;
    
    try {
      await createMechanic(newMechanic);
      setNewMechanic(null);
      loadMechanics();
    } catch (error) {
      console.error('Error saving mechanic:', error);
      alert('Failed to save mechanic');
    }
  };

  const handleUpdateMechanic = async () => {
    if (!editingMechanic) return;
    
    try {
      await updateMechanic(editingMechanic.id, editingMechanic);
      setEditingMechanic(null);
      loadMechanics();
    } catch (error) {
      console.error('Error updating mechanic:', error);
      alert('Failed to update mechanic');
    }
  };

  const handleDeleteMechanic = async (mechanicId: string) => {
    if (!window.confirm('Are you sure you want to delete this mechanic?')) return;
    
    try {
      await deleteMechanic(mechanicId);
      loadMechanics();
    } catch (error) {
      console.error('Error deleting mechanic:', error);
      alert('Failed to delete mechanic');
    }
  };

  const handleWorkingHoursChange = (mechanicId: string, dayId: number, field: keyof MechanicWorkingHour, value: string | boolean) => {
    setWorkingHours(prev => {
      const mechanicHours = [...(prev[mechanicId] || [])];
      const dayIndex = mechanicHours.findIndex(h => h.day_of_week === dayId);
      
      if (dayIndex >= 0) {
        mechanicHours[dayIndex] = { ...mechanicHours[dayIndex], [field]: value };
      } else {
        mechanicHours.push({
          id: '',
          mechanic_id: mechanicId,
          day_of_week: dayId,
          start_time: '09:00:00',
          end_time: '17:00:00',
          is_available: true,
          created_at: '',
          updated_at: ''
        } as MechanicWorkingHour);
      }
      
      return { ...prev, [mechanicId]: mechanicHours };
    });
  };

  const handleSaveWorkingHours = async (mechanicId: string) => {
    try {
      const hoursToSave = workingHours[mechanicId] || [];
      // Prepare data for upsert (remove fields that shouldn't be sent)
      const preparedHours = hoursToSave.map(h => ({
        mechanic_id: h.mechanic_id,
        day_of_week: h.day_of_week,
        start_time: h.start_time,
        end_time: h.end_time,
        is_available: h.is_available
      }));
      
      await upsertMechanicWorkingHours(preparedHours);
      loadMechanics(); // Reload to get updated data
      alert('Working hours saved successfully');
    } catch (error) {
      console.error('Error saving working hours:', error);
      alert('Failed to save working hours');
    }
  };

  const toggleExpandMechanic = (mechanicId: string) => {
    setExpandedMechanic(expandedMechanic === mechanicId ? null : mechanicId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mechanic Management</h2>
        <button
          onClick={handleAddMechanic}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Mechanic
        </button>
      </div>

      {newMechanic && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Mechanic</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                value={newMechanic.first_name}
                onChange={(e) => setNewMechanic({...newMechanic, first_name: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                value={newMechanic.last_name}
                onChange={(e) => setNewMechanic({...newMechanic, last_name: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={newMechanic.email || ''}
                onChange={(e) => setNewMechanic({...newMechanic, email: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="text"
                value={newMechanic.phone || ''}
                onChange={(e) => setNewMechanic({...newMechanic, phone: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
              <input
                type="number"
                min="0"
                value={newMechanic.years_of_experience}
                onChange={(e) => setNewMechanic({...newMechanic, years_of_experience: parseInt(e.target.value) || 0})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Hourly Rate ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newMechanic.hourly_rate}
                onChange={(e) => setNewMechanic({...newMechanic, hourly_rate: parseFloat(e.target.value) || 0})}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={() => setNewMechanic(null)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSaveNewMechanic}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Mechanic
            </button>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden rounded-md">
        <ul className="divide-y divide-gray-200">
          {mechanics.map((mechanic) => (
            <li key={mechanic.id}>
              {editingMechanic?.id === mechanic.id ? (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Mechanic</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Name</label>
                      <input
                        type="text"
                        value={editingMechanic.first_name}
                        onChange={(e) => setEditingMechanic({...editingMechanic, first_name: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Name</label>
                      <input
                        type="text"
                        value={editingMechanic.last_name}
                        onChange={(e) => setEditingMechanic({...editingMechanic, last_name: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        value={editingMechanic.email || ''}
                        onChange={(e) => setEditingMechanic({...editingMechanic, email: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="text"
                        value={editingMechanic.phone || ''}
                        onChange={(e) => setEditingMechanic({...editingMechanic, phone: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                      <input
                        type="number"
                        min="0"
                        value={editingMechanic.years_of_experience}
                        onChange={(e) => setEditingMechanic({...editingMechanic, years_of_experience: parseInt(e.target.value) || 0})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Hourly Rate ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingMechanic.hourly_rate}
                        onChange={(e) => setEditingMechanic({...editingMechanic, hourly_rate: parseFloat(e.target.value) || 0})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Bio</label>
                      <textarea
                        value={editingMechanic.bio || ''}
                        onChange={(e) => setEditingMechanic({...editingMechanic, bio: e.target.value})}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={() => setEditingMechanic(null)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateMechanic}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                        {mechanic.profile_image_url ? (
                          <img 
                            src={mechanic.profile_image_url} 
                            alt={`${mechanic.first_name} ${mechanic.last_name}`}
                            className="h-12 w-12 rounded-full"
                          />
                        ) : (
                          <User className="h-6 w-6 text-gray-600" />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {mechanic.first_name} {mechanic.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {mechanic.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleExpandMechanic(mechanic.id)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        {expandedMechanic === mechanic.id ? 'Hide Details' : 'Show Details'}
                      </button>
                      <button
                        onClick={() => setEditingMechanic(mechanic)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMechanic(mechanic.id)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {expandedMechanic === mechanic.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <Award className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          {mechanic.years_of_experience} years of experience
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Star className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          ${mechanic.hourly_rate}/hr
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Wrench className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          {mechanic.specializations.join(', ') || 'No specializations listed'}
                        </div>
                      </div>

                      {mechanic.bio && (
                        <div className="mt-3 text-sm text-gray-500">
                          <p className="font-medium">Bio:</p>
                          <p>{mechanic.bio}</p>
                        </div>
                      )}

                      <div className="mt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-2">Working Hours</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {daysOfWeek.map((day) => {
                                const hours = (workingHours[mechanic.id] || []).find(h => h.day_of_week === day.id);
                                return (
                                  <tr key={day.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <input
                                        type="checkbox"
                                        checked={hours?.is_available ?? false}
                                        onChange={(e) => handleWorkingHoursChange(mechanic.id, day.id, 'is_available', e.target.checked)}
                                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                      />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <input
                                        type="time"
                                        value={hours?.start_time ?? '09:00'}
                                        onChange={(e) => handleWorkingHoursChange(mechanic.id, day.id, 'start_time', e.target.value)}
                                        className="border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                      />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <input
                                        type="time"
                                        value={hours?.end_time ?? '17:00'}
                                        onChange={(e) => handleWorkingHoursChange(mechanic.id, day.id, 'end_time', e.target.value)}
                                        className="border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => handleSaveWorkingHours(mechanic.id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
                          >
                            <Save className="mr-1 h-4 w-4" />
                            Save Hours
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>

        {mechanics.length === 0 && !newMechanic && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No mechanics</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new mechanic.</p>
            <div className="mt-6">
              <button
                onClick={handleAddMechanic}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Mechanic
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}