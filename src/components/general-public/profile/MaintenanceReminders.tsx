import { useState } from 'react';
import { Bell, Wrench, Calendar, Car, Plus, Edit, Trash2, Check, ArrowLeft } from 'lucide-react';

interface Reminder {
  id: string;
  title: string;
  vehicle: string;
  dueDate: string;
  dueMileage?: number;
  frequency: 'once' | 'monthly' | 'quarterly' | 'annually' | 'mileage';
  mileageInterval?: number;
  completed: boolean;
  description?: string;
}

interface MaintenanceRemindersProps {
  onBack?: () => void;
}

export function MaintenanceReminders({ onBack }: MaintenanceRemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([
    {
      id: '1',
      title: 'Oil Change',
      vehicle: 'Toyota Camry 2018',
      dueDate: '2023-09-15',
      dueMileage: 47500,
      frequency: 'mileage',
      mileageInterval: 5000,
      completed: false,
      description: 'Regular oil and filter change'
    },
    {
      id: '2',
      title: 'Tire Rotation',
      vehicle: 'Toyota Camry 2018',
      dueDate: '2023-08-20',
      dueMileage: 46000,
      frequency: 'mileage',
      mileageInterval: 7500,
      completed: false,
      description: 'Rotate tires for even wear'
    },
    {
      id: '3',
      title: 'Brake Inspection',
      vehicle: 'Honda Civic 2020',
      dueDate: '2023-11-10',
      frequency: 'annually',
      completed: false,
      description: 'Annual brake system inspection'
    },
    {
      id: '4',
      title: 'Air Filter Replacement',
      vehicle: 'Honda Civic 2020',
      dueDate: '2023-07-25',
      completed: true,
      description: 'Replace engine air filter'
    }
  ]);

  const [showAddReminder, setShowAddReminder] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const toggleComplete = (id: string) => {
    setReminders(reminders.map(reminder => 
      reminder.id === id ? { ...reminder, completed: !reminder.completed } : reminder
    ));
  };

  const handleDeleteReminder = (id: string) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      setReminders(reminders.filter(reminder => reminder.id !== id));
    }
  };

  const isOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today && !isNaN(due.getTime());
  };

  const getFrequencyText = (frequency: Reminder['frequency'], mileageInterval?: number) => {
    switch (frequency) {
      case 'once': return 'Once';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'annually': return 'Annually';
      case 'mileage': return `Every ${mileageInterval?.toLocaleString()} miles`;
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
        <h1 className="text-2xl font-bold text-gray-900">Maintenance Reminders</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Maintenance</h2>
              <p className="text-slate-600 text-sm">
                Never miss a service with automated reminders
              </p>
            </div>
            <button 
              onClick={() => setShowAddReminder(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Reminder
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600">Total Reminders</div>
              <div className="text-xl font-semibold">{reminders.length}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600">Pending</div>
              <div className="text-xl font-semibold">{reminders.filter(r => !r.completed).length}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600">Completed</div>
              <div className="text-xl font-semibold">{reminders.filter(r => r.completed).length}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600">Overdue</div>
              <div className="text-xl font-semibold">
                {reminders.filter(r => !r.completed && isOverdue(r.dueDate)).length}
              </div>
            </div>
          </div>
        </div>

        {/* Reminders List */}
        <div className="divide-y divide-slate-200">
          {reminders.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No reminders set</h3>
              <p className="mt-1 text-sm text-slate-500">
                Get started by adding your first maintenance reminder.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddReminder(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reminder
                </button>
              </div>
            </div>
          ) : (
            reminders.map((reminder) => (
              <div 
                key={reminder.id} 
                className={`px-6 py-5 hover:bg-slate-50 transition ${
                  reminder.completed ? 'bg-green-50' : isOverdue(reminder.dueDate) ? 'bg-red-50' : ''
                }`}
              >
                <div className="flex">
                  <div className="flex-shrink-0 pt-1">
                    <button 
                      onClick={() => toggleComplete(reminder.id)}
                      className={`flex items-center justify-center h-6 w-6 rounded-full border ${
                        reminder.completed 
                          ? 'bg-green-500 border-green-500' 
                          : isOverdue(reminder.dueDate)
                            ? 'border-red-500'
                            : 'border-slate-300'
                      }`}
                    >
                      {reminder.completed && <Check className="h-4 w-4 text-white" />}
                    </button>
                  </div>
                  
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center">
                          <h3 className={`text-base font-medium ${
                            reminder.completed 
                              ? 'text-slate-500 line-through' 
                              : isOverdue(reminder.dueDate) 
                                ? 'text-red-700' 
                                : 'text-slate-900'
                          }`}>
                            {reminder.title}
                          </h3>
                          {isOverdue(reminder.dueDate) && !reminder.completed && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Overdue
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-1 flex items-center text-sm text-slate-600">
                          <Car className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                          {reminder.vehicle}
                        </div>
                        
                        <div className="mt-2 flex flex-wrap gap-2">
                          <div className="flex items-center text-sm">
                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            <span className={isOverdue(reminder.dueDate) && !reminder.completed ? 'text-red-600 font-medium' : ''}>
                              Due: {new Date(reminder.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {reminder.dueMileage && (
                            <div className="flex items-center text-sm text-slate-600">
                              <Wrench className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                              <span>At {reminder.dueMileage.toLocaleString()} miles</span>
                            </div>
                          )}
                          
                          <div className="flex items-center text-sm text-slate-600">
                            <Bell className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            <span>{getFrequencyText(reminder.frequency, reminder.mileageInterval)}</span>
                          </div>
                        </div>
                        
                        {reminder.description && (
                          <p className="mt-2 text-sm text-slate-600">
                            {reminder.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button 
                          onClick={() => setEditingReminder(reminder)}
                          className="p-2 rounded-full hover:bg-slate-100"
                        >
                          <Edit className="h-4 w-4 text-slate-500" />
                        </button>
                        <button 
                          onClick={() => handleDeleteReminder(reminder.id)}
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

      {/* Add/Edit Reminder Modal */}
      {(showAddReminder || editingReminder) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingReminder ? 'Edit Reminder' : 'Add New Reminder'}
            </h3>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  defaultValue={editingReminder?.title || ''}
                  placeholder="e.g., Oil Change"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vehicle
                </label>
                <select 
                  defaultValue={editingReminder?.vehicle || ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="Toyota Camry 2018">Toyota Camry 2018</option>
                  <option value="Honda Civic 2020">Honda Civic 2020</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  defaultValue={editingReminder?.description || ''}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    defaultValue={editingReminder?.dueDate || ''}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Due Mileage
                  </label>
                  <input
                    type="number"
                    defaultValue={editingReminder?.dueMileage || ''}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Frequency
                </label>
                <select 
                  defaultValue={editingReminder?.frequency || 'once'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="once">Once</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                  <option value="mileage">Mileage Based</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mileage Interval (if mileage based)
                </label>
                <input
                  type="number"
                  defaultValue={editingReminder?.mileageInterval || ''}
                  placeholder="e.g., 5000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddReminder(false);
                    setEditingReminder(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                >
                  {editingReminder ? 'Update Reminder' : 'Add Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}