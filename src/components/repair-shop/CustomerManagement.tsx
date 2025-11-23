import { useState, useEffect } from 'react';
import { 
  User, 
  Search, 
  Phone, 
  Mail, 
  Car, 
  Wrench, 
  Calendar,
  Filter
} from 'lucide-react';
import { supabase, Customer } from '../../lib/supabase';
import { CustomerProfile } from './CustomerProfile';

export function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'last_visit' | 'total_appointments'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterAndSortCustomers();
  }, [customers, searchTerm, sortBy, sortOrder]);

  async function fetchCustomers() {
    try {
      setLoading(true);
      
      // Fetch customers with appointment counts and last visit
      const { data: customersData, error } = await supabase
        .from('customers')
        .select('*');

      if (error) throw error;
      
      // Get appointment data for each customer
      const customersWithStats = await Promise.all(
        customersData.map(async (customer) => {
          const { count: appointmentCount, error: countError } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .or(`customer_name.eq.${customer.name},customer_email.eq.${customer.email}`);
          
          const { data: lastAppointmentData, error: lastAppointmentError } = await supabase
            .from('appointments')
            .select('appointment_date')
            .or(`customer_name.eq.${customer.name},customer_email.eq.${customer.email}`)
            .order('appointment_date', { ascending: false })
            .limit(1);
          
          return {
            ...customer,
            total_appointments: countError ? 0 : appointmentCount || 0,
            last_visit: lastAppointmentError || !lastAppointmentData?.[0] 
              ? null 
              : lastAppointmentData[0].appointment_date
          };
        })
      );
      
      setCustomers(customersWithStats);
    } catch (err) {
      console.error('Error fetching customers:', err);
      alert('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }

  function filterAndSortCustomers() {
    let result = [...customers];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(customer => 
        customer.name.toLowerCase().includes(term) ||
        customer.email?.toLowerCase().includes(term) ||
        customer.phone?.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'last_visit':
          if (!a.last_visit && !b.last_visit) comparison = 0;
          else if (!a.last_visit) comparison = 1;
          else if (!b.last_visit) comparison = -1;
          else comparison = new Date(a.last_visit).getTime() - new Date(b.last_visit).getTime();
          break;
        case 'total_appointments':
          comparison = (a.total_appointments || 0) - (b.total_appointments || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredCustomers(result);
  }

  function handleSort(column: 'name' | 'last_visit' | 'total_appointments') {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  }

  if (selectedCustomerId) {
    return (
      <CustomerProfile 
        customerId={selectedCustomerId} 
        onClose={() => setSelectedCustomerId(null)}
        onCustomerUpdate={fetchCustomers}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <User className="mr-2" />
          Customer Management
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          View and manage customer profiles, vehicle information, and service history
        </p>
      </div>
      
      {/* Search and Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
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
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Filter className="h-5 w-5 text-gray-400 mr-2" />
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  setSortBy(newSortBy as any);
                  setSortOrder(newSortOrder as any);
                }}
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="last_visit-desc">Last Visit (Newest)</option>
                <option value="last_visit-asc">Last Visit (Oldest)</option>
                <option value="total_appointments-desc">Most Appointments</option>
                <option value="total_appointments-asc">Fewest Appointments</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Customer List */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search' : 'Get started by adding a new customer'}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Customer
                    {sortBy === 'name' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('last_visit')}
                >
                  <div className="flex items-center">
                    Last Visit
                    {sortBy === 'last_visit' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('total_appointments')}
                >
                  <div className="flex items-center">
                    Appointments
                    {sortBy === 'total_appointments' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr 
                  key={customer.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedCustomerId(customer.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.email}</div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {customer.phone || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(customer.last_visit)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Wrench className="h-4 w-4 mr-1" />
                      {customer.total_appointments || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      className="text-orange-600 hover:text-orange-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomerId(customer.id);
                      }}
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Summary Stats */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{filteredCustomers.length}</span> of{' '}
            <span className="font-medium">{customers.length}</span> customers
          </p>
        </div>
      </div>
    </div>
  );
}