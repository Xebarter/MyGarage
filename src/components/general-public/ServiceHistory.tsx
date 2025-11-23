import { useState, useEffect } from 'react';
import { 
  Wrench, 
  Calendar, 
  Car, 
  FileText, 
  Download, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Phone,
  MapPin,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Appointment {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  appointment_date: string;
  service_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  notes: string | null;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'declined';
  created_at: string;
  updated_at: string;
}

interface ServiceHistoryProps {
  onBack?: () => void;
}

interface ServiceRecord {
  id: string;
  appointment_id: string;
  mechanic_name: string;
  repair_shop: string;
  service_date: string;
  service_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  description: string;
  parts_used: string[];
  labor_hours: number;
  total_cost: number;
  mechanic_notes: string;
  inspection_report_url: string | null;
  invoice_url: string | null;
  rating: number | null;
  created_at: string;
}

export function ServiceHistory({ onBack }: ServiceHistoryProps) {
  const [activeTab, setActiveTab] = useState<string>('bookings');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [filteredServiceRecords, setFilteredServiceRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled' | 'scheduled' | 'in_progress' | 'declined'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '30days' | '6months' | '1year'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [appointments, serviceRecords, activeTab, searchTerm, statusFilter, dateFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch completed appointments (bookings)
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Mock service records since there's no dedicated table in the schema
      // In a real implementation, this would come from a service_records table
      const mockServiceRecords: ServiceRecord[] = appointmentsData
        ?.filter((a: Appointment) => a.status === 'completed')
        .map((appointment: Appointment) => ({
          id: `sr-${appointment.id}`,
          appointment_id: appointment.id,
          mechanic_name: "John Smith",
          repair_shop: "AutoCare Specialists",
          service_date: appointment.appointment_date,
          service_type: appointment.service_type,
          vehicle_make: appointment.vehicle_make,
          vehicle_model: appointment.vehicle_model,
          vehicle_year: appointment.vehicle_year,
          description: `Completed ${appointment.service_type} service`,
          parts_used: ["Oil Filter", "Engine Oil"],
          labor_hours: 2.5,
          total_cost: 125.75,
          mechanic_notes: "Vehicle serviced according to manufacturer specifications. All systems functioning normally.",
          inspection_report_url: "#",
          invoice_url: "#",
          rating: Math.floor(Math.random() * 3) + 3, // Random rating 3-5
          created_at: appointment.updated_at || appointment.created_at
        })) || [];

      setAppointments(appointmentsData || []);
      setServiceRecords(mockServiceRecords);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterData() {
    const today = new Date();
    
    if (activeTab == 'bookings') {
      let result = [...appointments];
      
      // Apply search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(appointment => 
          appointment.customer_name.toLowerCase().includes(term) ||
          appointment.service_type.toLowerCase().includes(term) ||
          appointment.vehicle_make.toLowerCase().includes(term) ||
          appointment.vehicle_model.toLowerCase().includes(term)
        );
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        result = result.filter(appointment => appointment.status === statusFilter);
      }
      
      // Apply date filter
      if (dateFilter !== 'all') {
        const cutoffDate = new Date(today);
        switch (dateFilter) {
          case '30days':
            cutoffDate.setDate(cutoffDate.getDate() - 30);
            break;
          case '6months':
            cutoffDate.setMonth(cutoffDate.getMonth() - 6);
            break;
          case '1year':
            cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
            break;
        }
        
        result = result.filter(appointment => 
          new Date(appointment.appointment_date) >= cutoffDate
        );
      }
      
      setFilteredAppointments(result);
    } else {
      let result = [...serviceRecords];
      
      // Apply search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(record => 
          record.mechanic_name.toLowerCase().includes(term) ||
          record.repair_shop.toLowerCase().includes(term) ||
          record.service_type.toLowerCase().includes(term) ||
          record.vehicle_make.toLowerCase().includes(term) ||
          record.vehicle_model.toLowerCase().includes(term)
        );
      }
      
      // Apply date filter
      if (dateFilter !== 'all') {
        const cutoffDate = new Date(today);
        switch (dateFilter) {
          case '30days':
            cutoffDate.setDate(cutoffDate.getDate() - 30);
            break;
          case '6months':
            cutoffDate.setMonth(cutoffDate.getMonth() - 6);
            break;
          case '1year':
            cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
            break;
        }
        
        result = result.filter(record => 
          new Date(record.service_date) >= cutoffDate
        );
      }
      
      setFilteredServiceRecords(result);
    }
    
    setCurrentPage(1); // Reset to first page when filters change
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress':
        return <Wrench className="w-4 h-4 text-blue-500" />;
      case 'declined':
        return <XCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = activeTab == 'bookings' 
    ? filteredAppointments.slice(indexOfFirstItem, indexOfLastItem)
    : filteredServiceRecords.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(
    (activeTab == 'bookings' ? filteredAppointments.length : filteredServiceRecords.length) / itemsPerPage
  );

  function paginate(pageNumber: number) {
    setCurrentPage(pageNumber);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {onBack && (
        <button 
          onClick={onBack}
          className="inline-flex items-center text-orange-600 hover:text-orange-800 mb-4"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Profile
        </button>
      )}
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Service History</h1>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Wrench className="mr-3 h-8 w-8 text-blue-600" />
            Service History
          </h1>
          <p className="mt-2 text-gray-600">
            Access your completed services, invoices, mechanic notes, and downloadable inspection reports.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab == 'bookings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Booking History
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab == 'records'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Service Records Archive
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by service type, vehicle..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="declined">Declined</option>
              </select>
            </div>
            
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
              >
                <option value="all">All Time</option>
                <option value="30days">Last 30 Days</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab == 'bookings' ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {currentItems.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You don't have any service bookings yet.
                </p>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-gray-200">
                  {(currentItems as Appointment[]).map((appointment) => (
                    <li key={appointment.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {getStatusIcon(appointment.status)}
                            <p className="text-sm font-medium text-blue-600 truncate ml-2">
                              {appointment.service_type}
                            </p>
                          </div>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                              {appointment.status.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <div className="flex items-center text-sm text-gray-500 mr-6">
                              <Car className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                              {appointment.vehicle_year} {appointment.vehicle_make} {appointment.vehicle_model}
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                              <User className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                              {appointment.customer_name}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                            <time dateTime={appointment.appointment_date}>
                              {formatDate(appointment.appointment_date)}
                            </time>
                          </div>
                        </div>
                        {appointment.notes && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Notes:</span> {appointment.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                          <span className="font-medium">
                            {Math.min(indexOfLastItem, activeTab === 'bookings' ? filteredAppointments.length : filteredServiceRecords.length)}
                          </span>{' '}
                          of{' '}
                          <span className="font-medium">
                            {activeTab === 'bookings' ? filteredAppointments.length : filteredServiceRecords.length}
                          </span>{' '}
                          results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <span className="sr-only">Previous</span>
                            Previous
                          </button>
                          {[...Array(totalPages)].map((_, i) => (
                            <button
                              key={i}
                              onClick={() => paginate(i + 1)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === i + 1
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <span className="sr-only">Next</span>
                            Next
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {currentItems.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No service records found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You don't have any service records yet.
                </p>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-gray-200">
                  {(currentItems as ServiceRecord[]).map((record) => (
                    <li key={record.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Wrench className="flex-shrink-0 mr-1.5 h-5 w-5 text-blue-500" />
                            <p className="text-sm font-medium text-blue-600 truncate">
                              {record.service_type}
                            </p>
                          </div>
                          <div className="ml-2 flex items-center">
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(record.total_cost)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <div className="flex items-center text-sm text-gray-500 mr-6">
                              <Car className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                              {record.vehicle_year} {record.vehicle_make} {record.vehicle_model}
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                              <User className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                              {record.mechanic_name}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                            <time dateTime={record.service_date}>
                              {formatDate(record.service_date)}
                            </time>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Shop:</span> {record.repair_shop}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {record.parts_used.map((part, index) => (
                              <span 
                                key={index} 
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {part}
                              </span>
                            ))}
                          </div>
                          <div className="flex space-x-2">
                            {record.invoice_url && (
                              <button className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <Download className="mr-1 h-4 w-4" />
                                Invoice
                              </button>
                            )}
                            {record.inspection_report_url && (
                              <button className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <Download className="mr-1 h-4 w-4" />
                                Report
                              </button>
                            )}
                          </div>
                        </div>
                        {record.mechanic_notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Mechanic Notes:</span> {record.mechanic_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                          <span className="font-medium">
                            {Math.min(indexOfLastItem, activeTab === 'bookings' ? filteredAppointments.length : filteredServiceRecords.length)}
                          </span>{' '}
                          of{' '}
                          <span className="font-medium">
                            {activeTab === 'bookings' ? filteredAppointments.length : filteredServiceRecords.length}
                          </span>{' '}
                          results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <span className="sr-only">Previous</span>
                            Previous
                          </button>
                          {[...Array(totalPages)].map((_, i) => (
                            <button
                              key={i}
                              onClick={() => paginate(i + 1)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === i + 1
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <span className="sr-only">Next</span>
                            Next
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}