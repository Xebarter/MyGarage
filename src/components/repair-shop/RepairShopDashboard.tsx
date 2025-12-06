import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Car, 
  Wrench, 
  User, 
  Phone, 
  MapPin, 
  Star, 
  CheckCircle, 
  XCircle,
  Package,
  DollarSign,
  BarChart3,
  Search,
  Filter,
  Bell,
  AlertCircle,
  Check,
  ToggleLeft,
  ToggleRight,
  Plus,
  Edit,
  Trash2,
  MessageCircle
} from 'lucide-react';
import { supabase, RepairShop, Service, ServiceCategory } from '../../lib/supabase';
import { MechanicProfileAndVerification } from './MechanicProfileAndVerification';
import { MechanicStatusManager } from './MechanicStatusManager';
import { MessagingSystem } from './MessagingSystem';
import { MechanicManagement } from './MechanicManagement';

interface Appointment {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  appointment_date: string;
  service_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  notes: string;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'declined';
  created_at: string;
  reminder_sent?: boolean;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  total_appointments: number;
  last_visit: string;
}

export function RepairShopDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'appointments' | 'customers' | 'profile' | 'mechanic' | 'services' | 'messaging' | 'mechanics'>('dashboard');
  const [repairShop, setRepairShop] = useState<RepairShop | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'declined'>('all');
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: 0,
    duration_minutes: 60,
    category_id: '',
    featured: false
  });
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    fetchRepairShopData();
    fetchAppointments();
    fetchServices();
    fetchServiceCategories();
    fetchUnreadMessagesCount();
  }, []);

  useEffect(() => {
    if (appointments.length > 0) {
      filterAppointments();
      extractCustomers();
    }
  }, [appointments]);

  async function fetchRepairShopData() {
    // In a real implementation, you would identify the logged-in repair shop
    // For now, we'll just get the first repair shop as an example
    const { data, error } = await supabase
      .from('repair_shops')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching repair shop data:', error);
    } else if (data && data.length > 0) {
      setRepairShop(data[0]);
    }
    setLoading(false);
  }

  async function fetchAppointments() {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
    } else {
      setAppointments(data || []);
    }
  }

  async function fetchServices() {
    if (!repairShop) return;
    
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('repair_shop_id', repairShop.id)
      .order('name');

    if (error) {
      console.error('Error fetching services:', error);
    } else {
      setServices(data || []);
    }
  }

  async function fetchServiceCategories() {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching service categories:', error);
    } else {
      setServiceCategories(data || []);
    }
  }

  async function fetchUnreadMessagesCount() {
    if (!repairShop) return;
    
    try {
      // First get conversation IDs for this repair shop
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('id')
        .eq('repair_shop_id', repairShop.id);

      if (conversationsError) throw conversationsError;
      
      if (!conversations || conversations.length === 0) {
        setUnreadMessagesCount(0);
        return;
      }
      
      const conversationIds = conversations.map(conv => conv.id);
      
      // Then count unread messages in those conversations
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_type', 'repair_shop') // Not sent by repair shop (i.e., sent by customer)
        .is('read_at', null);

      if (error) throw error;
      setUnreadMessagesCount(count || 0);
    } catch (err) {
      console.error('Error fetching unread messages count:', err);
    }
  }

  // Add this effect to periodically check for unread messages
  useEffect(() => {
    if (repairShop && activeTab === 'messaging') {
      // Reset unread count when viewing messages
      setUnreadMessagesCount(0);
    }
    
    if (repairShop && activeTab !== 'messaging') {
      // Periodically check for new unread messages
      const interval = setInterval(() => {
        fetchUnreadMessagesCount();
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [repairShop, activeTab]);

  function filterAppointments() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    const todayApps = appointments.filter(app => {
      const appDate = new Date(app.appointment_date);
      return appDate >= today && appDate < todayEnd;
    });
    
    const upcomingApps = appointments.filter(app => {
      const appDate = new Date(app.appointment_date);
      return appDate >= todayEnd;
    });
    
    setTodayAppointments(todayApps);
    setUpcomingAppointments(upcomingApps);
  }

  function extractCustomers() {
    // Create a map to store unique customers and their appointment counts
    const customerMap = new Map<string, Customer>();
    
    appointments.forEach(appointment => {
      const key = `${appointment.customer_name}-${appointment.customer_email}`;
      
      if (customerMap.has(key)) {
        const customer = customerMap.get(key)!;
        customer.total_appointments += 1;
        if (!customer.last_visit || new Date(appointment.appointment_date) > new Date(customer.last_visit)) {
          customer.last_visit = appointment.appointment_date;
        }
      } else {
        customerMap.set(key, {
          id: key,
          name: appointment.customer_name,
          email: appointment.customer_email,
          phone: appointment.customer_phone,
          total_appointments: 1,
          last_visit: appointment.appointment_date
        });
      }
    });
    
    setCustomers(Array.from(customerMap.values()));
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  async function updateAppointmentStatus(id: string, status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'declined') {
    const { error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating appointment status:', error);
    } else {
      // Refresh appointments
      fetchAppointments();
    }
  }

  async function sendReminder(id: string) {
    // In a real implementation, this would send an actual reminder (email/SMS)
    console.log(`Reminder sent for appointment ${id}`);
    
    const { error } = await supabase
      .from('appointments')
      .update({ reminder_sent: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating appointment reminder status:', error);
    } else {
      // Refresh appointments
      fetchAppointments();
    }
  }

  async function toggleAvailability() {
    if (!repairShop) return;
    
    const newStatus = repairShop.availability_status === 'available' ? 'offline' : 'available';
    
    const { error } = await supabase
      .from('repair_shops')
      .update({ availability_status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', repairShop.id);

    if (error) {
      console.error('Error updating availability status:', error);
    } else {
      // Update local state
      setRepairShop({
        ...repairShop,
        availability_status: newStatus
      });
    }
  }

  async function addService() {
    if (!repairShop) return;
    
    const serviceData = {
      ...newService,
      repair_shop_id: repairShop.id
    };

    const { error } = await supabase
      .from('services')
      .insert([serviceData]);

    if (error) {
      console.error('Error adding service:', error);
    } else {
      // Reset form and refresh services
      setNewService({
        name: '',
        description: '',
        price: 0,
        duration_minutes: 60,
        category_id: '',
        featured: false
      });
      fetchServices();
    }
  }

  async function updateService() {
    if (!editingService) return;
    
    const { error } = await supabase
      .from('services')
      .update({
        name: editingService.name,
        description: editingService.description,
        price: editingService.price,
        duration_minutes: editingService.duration_minutes,
        category_id: editingService.category_id,
        featured: editingService.featured,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingService.id);

    if (error) {
      console.error('Error updating service:', error);
    } else {
      // Reset form and refresh services
      setEditingService(null);
      fetchServices();
    }
  }

  async function deleteService(id: string) {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting service:', error);
    } else {
      // Refresh services
      fetchServices();
    }
  }

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(term) ||
      customer.email.toLowerCase().includes(term) ||
      customer.phone.includes(term)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Wrench className="h-8 w-8 text-orange-500" />
                <h1 className="ml-2 text-xl font-bold text-gray-900">Mechanic Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center">
              <button className="relative p-1 text-gray-600 hover:text-gray-900 focus:outline-none mr-4">
                <Bell className="h-6 w-6" />
                {appointments.filter(a => a.status === 'pending').length > 0 && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
                )}
              </button>
              <div className="ml-3 relative">
                <div className="flex items-center space-x-3">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium text-gray-900">
                      {repairShop?.name || 'Repair Shop'}
                    </p>
                    <p className="text-xs text-gray-500">Mechanic Portal</p>
                  </div>
                  <div className="bg-gray-200 rounded-full p-2">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'appointments'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              All Appointments
              {appointments.filter(a => a.status === 'pending').length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                  {appointments.filter(a => a.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'customers'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Customers
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Shop Profile
            </button>
            <button
              onClick={() => setActiveTab('mechanic')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'mechanic'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Wrench className="w-4 h-4 inline mr-2" />
              Mechanic Profile
            </button>
            <button
              onClick={() => setActiveTab('messaging')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'messaging'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageCircle className="w-4 h-4 inline mr-2" />
              Messaging
            </button>
            <button
              onClick={() => setActiveTab('mechanics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'mechanics'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Mechanics
            </button>
          </div>
        </nav>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
              <p className="mt-1 text-sm text-gray-500">Welcome back! Here's what's happening today.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-orange-100 rounded-md p-3">
                      <AlertCircle className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Requests</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {appointments.filter(a => a.status === 'pending').length}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Scheduled Today</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">{todayAppointments.length}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {appointments.filter(a => a.status === 'completed').length}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                      <User className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">{customers.length}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Today's Appointments */}
              <div className="lg:col-span-2 bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Today's Appointments</h3>
                  <p className="mt-1 text-sm text-gray-500">Scheduled services for today</p>
                </div>
                <div className="border-t border-gray-200">
                  {todayAppointments.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments scheduled</h3>
                      <p className="mt-1 text-sm text-gray-500">You have no appointments for today.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {todayAppointments.map((appointment) => (
                        <li key={appointment.id}>
                          <div className="px-4 py-4 flex items-center sm:px-6">
                            <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                              <div className="truncate">
                                <div className="flex text-sm">
                                  <p className="font-medium text-orange-600 truncate">{appointment.customer_name}</p>
                                  <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                                    for their {appointment.vehicle_year} {appointment.vehicle_make} {appointment.vehicle_model}
                                  </p>
                                </div>
                                <div className="mt-2 flex">
                                  <div className="flex items-center text-sm text-gray-500">
                                    <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                    <p>{formatDateTime(appointment.appointment_date)}</p>
                                  </div>
                                </div>
                                <div className="mt-1 flex items-center text-sm text-gray-500">
                                  <Wrench className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                  <p>{appointment.service_type}</p>
                                </div>
                                {appointment.notes && (
                                  <div className="mt-1 flex items-center text-sm text-gray-500">
                                    <p className="italic">"{appointment.notes}"</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="ml-5 flex-shrink-0 flex space-x-2">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                appointment.status === 'pending' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : appointment.status === 'scheduled' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : appointment.status === 'in_progress'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : appointment.status === 'completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {appointment.status === 'pending' ? 'Pending' : 
                                 appointment.status === 'scheduled' ? 'Scheduled' :
                                 appointment.status === 'in_progress' ? 'In Progress' :
                                 appointment.status === 'completed' ? 'Completed' : 'Cancelled'}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              
              {/* Mechanic Status Card */}
              <div className="lg:col-span-1">
                {repairShop && (
                  <MechanicStatusManager 
                    repairShop={repairShop} 
                    onUpdate={() => fetchRepairShopData()}
                  />
                )}
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Appointments</h3>
                <p className="mt-1 text-sm text-gray-500">Scheduled services for the future</p>
              </div>
              <div className="border-t border-gray-200">
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming appointments</h3>
                    <p className="mt-1 text-sm text-gray-500">You have no appointments scheduled for the future.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {upcomingAppointments.map((appointment) => (
                      <li key={appointment.id}>
                        <div className="px-4 py-4 flex items-center sm:px-6">
                          <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                            <div className="truncate">
                              <div className="flex text-sm">
                                <p className="font-medium text-orange-600 truncate">{appointment.customer_name}</p>
                                <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                                  for their {appointment.vehicle_year} {appointment.vehicle_make} {appointment.vehicle_model}
                                </p>
                              </div>
                              <div className="mt-2 flex">
                                <div className="flex items-center text-sm text-gray-500">
                                  <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                  <p>{formatDateTime(appointment.appointment_date)}</p>
                                </div>
                              </div>
                              <div className="mt-1 flex items-center text-sm text-gray-500">
                                <Wrench className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                <p>{appointment.service_type}</p>
                              </div>
                              {appointment.notes && (
                                <div className="mt-1 flex items-center text-sm text-gray-500">
                                  <p className="italic">"{appointment.notes}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="ml-5 flex-shrink-0 flex space-x-2">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              appointment.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : appointment.status === 'scheduled' 
                                ? 'bg-blue-100 text-blue-800'
                                : appointment.status === 'in_progress'
                                ? 'bg-indigo-100 text-indigo-800'
                                : appointment.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {appointment.status === 'pending' ? 'Pending' : 
                               appointment.status === 'scheduled' ? 'Scheduled' :
                               appointment.status === 'in_progress' ? 'In Progress' :
                               appointment.status === 'completed' ? 'Completed' : 'Cancelled'}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Appointments Tab - now includes both job requests and appointments */}
        {activeTab === 'appointments' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">All Appointments</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage all customer appointments and service requests
              </p>
            </div>

            {/* Filters */}
            <div className="mb-6 bg-white shadow rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    placeholder="Search appointments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Filter className="h-5 w-5 text-gray-400 mr-2" />
                    <select
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending Job Requests</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="border-t border-gray-200">
                {appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
                    <p className="mt-1 text-sm text-gray-500">There are no appointments scheduled yet.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {appointments
                      .filter((appointment) => {
                        if (statusFilter !== 'all' && appointment.status !== statusFilter) {
                          return false;
                        }
                        
                        if (searchTerm) {
                          const term = searchTerm.toLowerCase();
                          return (
                            appointment.customer_name.toLowerCase().includes(term) ||
                            appointment.service_type.toLowerCase().includes(term) ||
                            appointment.vehicle_make.toLowerCase().includes(term) ||
                            appointment.vehicle_model.toLowerCase().includes(term) ||
                            appointment.vehicle_year.toString().includes(term)
                          );
                        }
                        return true;
                      })
                      .map((appointment) => (
                        <li key={appointment.id}>
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center">
                                  <p className="text-sm font-medium text-orange-600 truncate">
                                    {appointment.customer_name}
                                  </p>
                                  <span
                                    className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                                    }`}
                                  >
                                    {appointment.status === 'pending' ? 'Pending Request' : 
                                     appointment.status === 'scheduled' ? 'Scheduled' :
                                     appointment.status === 'in_progress' ? 'In Progress' :
                                     appointment.status === 'completed' ? 'Completed' :
                                     appointment.status === 'declined' ? 'Declined' : 'Cancelled'}
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-4">
                                  <div className="flex items-center text-sm text-gray-500">
                                    <Car className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                    <span>
                                      {appointment.vehicle_year} {appointment.vehicle_make} {appointment.vehicle_model}
                                    </span>
                                  </div>
                                  <div className="flex items-center text-sm text-gray-500">
                                    <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                    <span>{formatDateTime(appointment.appointment_date)}</span>
                                  </div>
                                  <div className="flex items-center text-sm text-gray-500">
                                    <Wrench className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                    <span>{appointment.service_type}</span>
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-4">
                                  <div className="flex items-center text-sm text-gray-500">
                                    <User className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                    <span>{appointment.customer_email}</span>
                                  </div>
                                  {appointment.customer_phone && (
                                    <div className="flex items-center text-sm text-gray-500">
                                      <Phone className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                      <span>{appointment.customer_phone}</span>
                                    </div>
                                  )}
                                </div>
                                {appointment.notes && (
                                  <div className="mt-2 text-sm text-gray-500">
                                    <p className="italic">"{appointment.notes}"</p>
                                  </div>
                                )}
                              </div>
                              <div className="ml-5 flex-shrink-0 flex flex-col space-y-2">
                                {appointment.status === 'scheduled' && (
                                  <>
                                    <button
                                      onClick={() => updateAppointmentStatus(appointment.id, 'in_progress')}
                                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                                    >
                                      Start Work
                                    </button>
                                    <button
                                      onClick={() => sendReminder(appointment.id)}
                                      disabled={appointment.reminder_sent}
                                      className={`inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md ${
                                        appointment.reminder_sent 
                                          ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                                          : 'text-gray-700 bg-white hover:bg-gray-50 focus:outline-none'
                                      }`}
                                    >
                                      <Bell className="mr-1 h-4 w-4" />
                                      {appointment.reminder_sent ? 'Reminder Sent' : 'Send Reminder'}
                                    </button>
                                  </>
                                )}
                                {appointment.status === 'in_progress' && (
                                  <button
                                    onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                                  >
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    Complete Job
                                  </button>
                                )}
                                {appointment.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => updateAppointmentStatus(appointment.id, 'scheduled')}
                                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                                    >
                                      <Check className="mr-1 h-4 w-4" />
                                      Accept Request
                                    </button>
                                    <button
                                      onClick={() => updateAppointmentStatus(appointment.id, 'declined')}
                                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                    >
                                      <XCircle className="mr-1 h-4 w-4" />
                                      Decline
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && repairShop && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Service Management</h2>
              <p className="mt-1 text-sm text-gray-500">Manage services offered at your shop</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {editingService ? 'Edit Service' : 'Add New Service'}
                    </h3>
                  </div>
                  <div className="px-4 py-5 sm:px-6">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (editingService) {
                        updateService();
                      } else {
                        addService();
                      }
                    }}>
                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-6">
                          <label htmlFor="service-name" className="block text-sm font-medium text-gray-700">
                            Service Name
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              id="service-name"
                              value={editingService ? editingService.name : newService.name}
                              onChange={(e) => {
                                if (editingService) {
                                  setEditingService({...editingService, name: e.target.value});
                                } else {
                                  setNewService({...newService, name: e.target.value});
                                }
                              }}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                              required
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="service-description" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <div className="mt-1">
                            <textarea
                              id="service-description"
                              rows={3}
                              value={editingService ? editingService.description : newService.description}
                              onChange={(e) => {
                                if (editingService) {
                                  setEditingService({...editingService, description: e.target.value});
                                } else {
                                  setNewService({...newService, description: e.target.value});
                                }
                              }}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="service-price" className="block text-sm font-medium text-gray-700">
                            Price ($)
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              id="service-price"
                              min="0"
                              step="0.01"
                              value={editingService ? editingService.price : newService.price}
                              onChange={(e) => {
                                if (editingService) {
                                  setEditingService({...editingService, price: parseFloat(e.target.value) || 0});
                                } else {
                                  setNewService({...newService, price: parseFloat(e.target.value) || 0});
                                }
                              }}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                              required
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="service-duration" className="block text-sm font-medium text-gray-700">
                            Duration (minutes)
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              id="service-duration"
                              min="15"
                              step="15"
                              value={editingService ? editingService.duration_minutes : newService.duration_minutes}
                              onChange={(e) => {
                                if (editingService) {
                                  setEditingService({...editingService, duration_minutes: parseInt(e.target.value) || 60});
                                } else {
                                  setNewService({...newService, duration_minutes: parseInt(e.target.value) || 60});
                                }
                              }}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-4">
                          <label htmlFor="service-category" className="block text-sm font-medium text-gray-700">
                            Category
                          </label>
                          <div className="mt-1">
                            <select
                              id="service-category"
                              value={editingService ? editingService.category_id || '' : newService.category_id}
                              onChange={(e) => {
                                if (editingService) {
                                  setEditingService({...editingService, category_id: e.target.value || null});
                                } else {
                                  setNewService({...newService, category_id: e.target.value});
                                }
                              }}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                            >
                              <option value="">Select a category</option>
                              {serviceCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-6 flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="service-featured"
                              type="checkbox"
                              checked={editingService ? editingService.featured : newService.featured}
                              onChange={(e) => {
                                if (editingService) {
                                  setEditingService({...editingService, featured: e.target.checked});
                                } else {
                                  setNewService({...newService, featured: e.target.checked});
                                }
                              }}
                              className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="service-featured" className="font-medium text-gray-700">
                              Featured Service
                            </label>
                            <p className="text-gray-500">Featured services will be highlighted in listings</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex space-x-3">
                        <button
                          type="submit"
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
                        >
                          {editingService ? 'Update Service' : 'Add Service'}
                        </button>
                        {editingService && (
                          <button
                            type="button"
                            onClick={() => setEditingService(null)}
                            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Service Categories</h3>
                  </div>
                  <div className="px-4 py-5 sm:px-6">
                    <ul className="space-y-2">
                      {serviceCategories.map((category) => (
                        <li key={category.id} className="flex items-center justify-between py-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{category.name}</p>
                            <p className="text-xs text-gray-500">{category.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Your Services</h3>
              </div>
              <div className="border-t border-gray-200">
                {services.length === 0 ? (
                  <div className="text-center py-12">
                    <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No services added</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by adding a new service.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {services.map((service) => {
                      const category = serviceCategories.find(c => c.id === service.category_id);
                      return (
                        <li key={service.id}>
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center">
                                  <p className="text-sm font-medium text-orange-600 truncate">
                                    {service.name}
                                  </p>
                                  {service.featured && (
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      Featured
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-4">
                                  <div className="flex items-center text-sm text-gray-500">
                                    <DollarSign className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                    <span>${service.price.toFixed(2)}</span>
                                  </div>
                                  <div className="flex items-center text-sm text-gray-500">
                                    <Clock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                    <span>{service.duration_minutes} mins</span>
                                  </div>
                                  {category && (
                                    <div className="flex items-center text-sm text-gray-500">
                                      <Package className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                      <span>{category.name}</span>
                                    </div>
                                  )}
                                </div>
                                {service.description && (
                                  <div className="mt-2 text-sm text-gray-500">
                                    <p>{service.description}</p>
                                  </div>
                                )}
                              </div>
                              <div className="ml-5 flex-shrink-0 flex space-x-2">
                                <button
                                  onClick={() => setEditingService(service)}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                >
                                  <Edit className="mr-1 h-4 w-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteService(service.id)}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none"
                                >
                                  <Trash2 className="mr-1 h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
              <p className="mt-1 text-sm text-gray-500">View and manage your customer base</p>
            </div>

            {/* Search */}
            <div className="mb-6 bg-white shadow rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="border-t border-gray-200">
                {customers.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No customers</h3>
                    <p className="mt-1 text-sm text-gray-500">There are no customers yet.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {filteredCustomers.map((customer) => (
                      <li key={customer.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-orange-600 truncate">
                                  {customer.name}
                                </p>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-4">
                                <div className="flex items-center text-sm text-gray-500">
                                  <User className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                  <span>{customer.email}</span>
                                </div>
                                {customer.phone && (
                                  <div className="flex items-center text-sm text-gray-500">
                                    <Phone className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                    <span>{customer.phone}</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-4">
                                <div className="flex items-center text-sm text-gray-500">
                                  <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                  <span>
                                    {customer.total_appointments} {customer.total_appointments === 1 ? 'appointment' : 'appointments'}
                                  </span>
                                </div>
                                <div className="flex items-center text-sm text-gray-500">
                                  <Clock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                  <span>Last visit: {formatDate(customer.last_visit)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="ml-5 flex-shrink-0">
                              <button className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && repairShop && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Shop Profile</h2>
              <p className="mt-1 text-sm text-gray-500">Manage your repair shop information</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Shop Information</h3>
                  </div>
                  <div className="px-4 py-5 sm:px-6">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Shop Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{repairShop.name}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                        <dd className="mt-1 text-sm text-gray-900">{repairShop.description || 'No description provided'}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="mt-1 text-sm text-gray-900">{repairShop.phone || 'Not provided'}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Email</dt>
                        <dd className="mt-1 text-sm text-gray-900">{repairShop.email || 'Not provided'}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Website</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {repairShop.website ? (
                            <a href={repairShop.website} className="text-orange-600 hover:text-orange-500">
                              {repairShop.website}
                            </a>
                          ) : (
                            'Not provided'
                          )}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Rating</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {repairShop.rating ? `${repairShop.rating}/5.0` : 'No ratings yet'}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Specialties</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {repairShop.specialties || 'No specialties listed'}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Address</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <div>{repairShop.address}</div>
                          <div>{repairShop.city}, {repairShop.state} {repairShop.zip_code}</div>
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Business Hours</dt>
                        <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                          {repairShop.hours || 'Not specified'}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Location</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <div>Latitude: {repairShop.latitude}</div>
                          <div>Longitude: {repairShop.longitude}</div>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Shop Image</h3>
                  </div>
                  <div className="px-4 py-5 sm:px-6">
                    {repairShop.image_url ? (
                      <img 
                        src={repairShop.image_url} 
                        alt={repairShop.name} 
                        className="w-full h-48 object-cover rounded-md"
                      />
                    ) : (
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-48 flex items-center justify-center">
                        <span className="text-gray-500">No image</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-6">
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
                  </div>
                  <div className="px-4 py-5 sm:px-6">
                    <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none">
                      <Package className="mr-2 h-4 w-4" />
                      Manage Services
                    </button>
                    <button className="w-full mt-3 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
                      <DollarSign className="mr-2 h-4 w-4" />
                      View Earnings
                    </button>
                    <button className="w-full mt-3 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
                      <Star className="mr-2 h-4 w-4" />
                      Customer Reviews
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mechanic Profile Tab */}
        {activeTab === 'mechanic' && repairShop && (
          <MechanicProfileAndVerification repairShop={repairShop} />
        )}

        {/* Messaging Tab */}
        {activeTab === 'messaging' && repairShop && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <MessagingSystem 
              repairShopId={repairShop.id} 
              onUnreadCountChange={setUnreadMessagesCount}
            />
          </div>
        )}

        {/* Mechanics Tab */}
        {activeTab === 'mechanics' && repairShop && (
          <MechanicManagement repairShopId={repairShop.id} />
        )}
      </main>
    </div>
  );
}
