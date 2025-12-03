import { useState } from 'react';
import { Calendar, Clock, MapPin, Car, Wrench, Phone, X, Check, ArrowLeft } from 'lucide-react';

interface Appointment {
  id: string;
  date: string;
  time: string;
  service: string;
  vehicle: string;
  shop: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  mechanic: string;
  contact: string;
}

interface AppointmentsProps {
  onBack?: () => void;
}

export function Appointments({ onBack }: AppointmentsProps) {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Mock data
  const appointments: Appointment[] = [
    {
      id: '1',
      date: '2023-07-15',
      time: '10:00 AM',
      service: 'Oil Change',
      vehicle: 'Toyota Camry 2018',
      shop: 'AutoCare Service Center',
      status: 'confirmed',
      mechanic: 'John Smith',
      contact: '(555) 123-4567'
    },
    {
      id: '2',
      date: '2023-06-20',
      time: '2:30 PM',
      service: 'Brake Inspection',
      vehicle: 'Honda Civic 2020',
      shop: 'Brake Experts',
      status: 'completed',
      mechanic: 'Sarah Johnson',
      contact: '(555) 987-6543'
    },
    {
      id: '3',
      date: '2023-07-22',
      time: '9:00 AM',
      service: 'Tire Rotation',
      vehicle: 'Toyota Camry 2018',
      shop: 'TireMaster Shop',
      status: 'confirmed',
      mechanic: 'Mike Davis',
      contact: '(555) 456-7890'
    },
    {
      id: '4',
      date: '2023-05-10',
      time: '11:00 AM',
      service: 'Engine Diagnostic',
      vehicle: 'Honda Civic 2020',
      shop: 'AutoCare Service Center',
      status: 'cancelled',
      mechanic: 'John Smith',
      contact: '(555) 123-4567'
    }
  ];

  const filteredAppointments = filter === 'all' 
    ? appointments 
    : appointments.filter(appointment => {
        if (filter === 'upcoming') {
          return appointment.status === 'confirmed';
        }
        if (filter === 'completed') {
          return appointment.status === 'completed';
        }
        if (filter === 'cancelled') {
          return appointment.status === 'cancelled';
        }
        return true;
      });

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'rescheduled': return 'Rescheduled';
      default: return '';
    }
  };

  const isUpcoming = (date: string) => {
    const today = new Date();
    const appointmentDate = new Date(date);
    return appointmentDate >= today;
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
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Service Appointments</h2>
              <p className="text-slate-600 text-sm">
                View and manage your upcoming and past appointments
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
                  onClick={() => setFilter('upcoming')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    filter === 'upcoming'
                      ? 'bg-blue-100 text-blue-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Upcoming
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
                  onClick={() => setFilter('cancelled')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    filter === 'cancelled'
                      ? 'bg-red-100 text-red-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancelled
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="divide-y divide-slate-200">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No appointments found</h3>
              <p className="mt-1 text-sm text-slate-500">
                You don't have any appointments matching your filter.
              </p>
            </div>
          ) : (
            filteredAppointments.map((appointment) => (
              <div 
                key={appointment.id} 
                className="px-6 py-5 hover:bg-slate-50 transition cursor-pointer"
                onClick={() => setSelectedAppointment(appointment)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <div className="bg-orange-100 p-2 rounded-lg mr-4">
                        <Wrench className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="flex items-center flex-wrap">
                          <h3 className="text-base font-medium text-slate-900">{appointment.service}</h3>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {getStatusText(appointment.status)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-4">
                          <div className="flex items-center text-sm text-slate-500 mt-1 sm:mt-0">
                            <Car className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            {appointment.vehicle}
                          </div>
                          <div className="flex items-center text-sm text-slate-500 mt-1 sm:mt-0">
                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                          </div>
                          <div className="flex items-center text-sm text-slate-500 mt-1 sm:mt-0">
                            <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            {appointment.shop}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0">
                    <button className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-slate-900">Appointment Details</h3>
              <button 
                onClick={() => setSelectedAppointment(null)}
                className="text-slate-400 hover:text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                  {getStatusText(selectedAppointment.status)}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <p className="text-sm text-slate-600">Date & Time</p>
                    <p className="font-medium">
                      {new Date(selectedAppointment.date).toLocaleDateString()} at {selectedAppointment.time}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Wrench className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <p className="text-sm text-slate-600">Service</p>
                    <p className="font-medium">{selectedAppointment.service}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Car className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <p className="text-sm text-slate-600">Vehicle</p>
                    <p className="font-medium">{selectedAppointment.vehicle}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <p className="text-sm text-slate-600">Service Shop</p>
                    <p className="font-medium">{selectedAppointment.shop}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <p className="text-sm text-slate-600">Contact</p>
                    <p className="font-medium">{selectedAppointment.contact}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-slate-400 mr-3" />
                  <div>
                    <p className="text-sm text-slate-600">Mechanic</p>
                    <p className="font-medium">{selectedAppointment.mechanic}</p>
                  </div>
                </div>
              </div>
              
              {selectedAppointment.status === 'confirmed' && isUpcoming(selectedAppointment.date) && (
                <div className="flex space-x-3 pt-2">
                  <button className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Reschedule
                  </button>
                  <button className="flex-1 px-4 py-2 border border-red-600 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}