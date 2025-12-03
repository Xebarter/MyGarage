import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { AppointmentCard } from '@/components/admin/AppointmentCard'
import { appointmentsApi } from '@/lib/api/appointments'

interface Appointment {
  id: string
  shopName: string
  mechanicName: string
  date: string
  time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  services: string[]
  vehicle: string
  notes?: string
  createdAt?: string
}

export function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [statusFilters, setStatusFilters] = useState(['all'])
  const [dateFilter, setDateFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{key: keyof Appointment, direction: 'asc' | 'desc'}>({ 
    key: 'date', 
    direction: 'desc' 
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [showScheduleSuccessModal, setShowScheduleSuccessModal] = useState(false)
  
  // Form state
  const [shopName, setShopName] = useState('')
  const [mechanicName, setMechanicName] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  
  // Fetch appointments from API
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true)
        const data = await appointmentsApi.getAllAppointments()
        setAppointments(data)
        setError(null)
      } catch (err) {
        setError('Failed to load appointments. Please try again later.')
        console.error('Error fetching appointments:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAppointments()
  }, [])
  
  // Apply filters and sorting
  useEffect(() => {
    let result = [...appointments]
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(appointment => 
        appointment.shopName.toLowerCase().includes(term) || 
        appointment.mechanicName.toLowerCase().includes(term) ||
        appointment.vehicle.toLowerCase().includes(term)
      )
    }
    
    // Apply status filters
    if (!statusFilters.includes('all')) {
      result = result.filter(appointment => statusFilters.includes(appointment.status))
    }
    
    // Apply date filter
    if (dateFilter) {
      result = result.filter(appointment => appointment.date === dateFilter)
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(`${a.date} ${a.time}`).getTime()
        const dateB = new Date(`${b.date} ${b.time}`).getTime()
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA
      } else {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue)
        }
        
        return 0
      }
    })
    
    setFilteredAppointments(result)
    setCurrentPage(1) // Reset to first page when filters change
  }, [appointments, statusFilters, dateFilter, searchTerm, sortConfig])
  
  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentAppointments = filteredAppointments.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage)
  
  // Handle status filter changes
  const handleStatusFilterChange = (status: string) => {
    if (status === 'all') {
      setStatusFilters(['all'])
    } else {
      const updatedFilters = statusFilters.includes(status)
        ? statusFilters.filter(s => s !== status)
        : [...statusFilters.filter(s => s !== 'all'), status]
      
      setStatusFilters(updatedFilters)
    }
  }
  
  // Handle date filter changes
  const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilter(e.target.value)
  }
  
  // Handle search term changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }
  
  // Handle sorting
  const handleSort = (key: keyof Appointment) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }
  
  // Handle service checkbox changes
  const handleServiceChange = (service: string, checked: boolean) => {
    if (checked) {
      setServices([...services, service])
    } else {
      setServices(services.filter(s => s !== service))
    }
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setScheduleError(null)
    
    try {
      // Create new appointment
      const newAppointment = await appointmentsApi.createAppointment({
        shopName,
        mechanicName,
        date: appointmentDate,
        time: appointmentTime,
        services,
        vehicle,
        notes
      })
      
      // Add new appointment to the list
      setAppointments(prev => [newAppointment, ...prev])
      
      // Close modal and show success modal
      setShowScheduleModal(false)
      setShowScheduleSuccessModal(true)
      
      // Reset form fields
      setShopName('')
      setMechanicName('')
      setAppointmentDate('')
      setAppointmentTime('')
      setVehicle('')
      setServices([])
    } catch (err) {
      setScheduleError('Failed to schedule appointment. Please try again.')
      console.error('Error scheduling appointment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }
  
  // Get upcoming appointments count
  const getUpcomingAppointmentsCount = () => {
    const today = new Date();
    return filteredAppointments.filter(appointment => {
      const apptDate = new Date(appointment.date);
      return apptDate >= today && appointment.status !== 'cancelled';
    }).length;
  };
  
  // Get recent appointments (last 30 days)
  const getRecentAppointmentsCount = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return filteredAppointments.filter(appointment => {
      const apptDate = new Date(appointment.date);
      return apptDate >= thirtyDaysAgo;
    }).length;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <p className="text-gray-600 mt-2">Manage your vehicle service appointments</p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={() => setShowScheduleModal(true)}
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Schedule Appointment
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
              <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Total Appointments</h3>
              <p className="text-2xl font-semibold text-gray-900">{appointments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Upcoming</h3>
              <p className="text-2xl font-semibold text-gray-900">{getUpcomingAppointmentsCount()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Recent (30 days)</h3>
              <p className="text-2xl font-semibold text-gray-900">{getRecentAppointmentsCount()}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
        <div className="flex flex-col gap-6">
          {/* Status filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                  checked={statusFilters.includes('all')}
                  onChange={() => handleStatusFilterChange('all')}
                />
                <span className="ml-2 text-sm text-gray-700">All</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                  checked={statusFilters.includes('pending')}
                  onChange={() => handleStatusFilterChange('pending')}
                />
                <span className="ml-2 text-sm text-gray-700">Pending</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                  checked={statusFilters.includes('confirmed')}
                  onChange={() => handleStatusFilterChange('confirmed')}
                />
                <span className="ml-2 text-sm text-gray-700">Confirmed</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                  checked={statusFilters.includes('completed')}
                  onChange={() => handleStatusFilterChange('completed')}
                />
                <span className="ml-2 text-sm text-gray-700">Completed</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                  checked={statusFilters.includes('cancelled')}
                  onChange={() => handleStatusFilterChange('cancelled')}
                />
                <span className="ml-2 text-sm text-gray-700">Cancelled</span>
              </label>
            </div>
          </div>
          
          {/* Date filter and search */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Date
              </label>
              <input
                type="date"
                id="date-filter"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={dateFilter}
                onChange={handleDateFilterChange}
              />
            </div>
            
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1012 0 6 6 0 00-12 0z" clipRule="evenodd" />
                    <path d="M12.93 12.93l2.81 2.81" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="search"
                  className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Search by shop, mechanic or vehicle"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Appointments list with sorting and pagination */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        ) : currentAppointments.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('shopName')}
                    >
                      <div className="flex items-center">
                        Shop Name
                        {sortConfig.key === 'shopName' && (
                          <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('mechanicName')}
                    >
                      <div className="flex items-center">
                        Mechanic
                        {sortConfig.key === 'mechanicName' && (
                          <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center">
                        Date & Time
                        {sortConfig.key === 'date' && (
                          <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {sortConfig.key === 'status' && (
                          <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{appointment.shopName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.mechanicName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(`${appointment.date} ${appointment.time}`), 'MMM d, yyyy h:mm a')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <AppointmentCard appointment={appointment} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === 1 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === totalPages 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(indexOfLastItem, filteredAppointments.length)}
                      </span>{' '}
                      of <span className="font-medium">{filteredAppointments.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                          currentPage === 1 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                          currentPage === totalPages 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilters.length > 0 || dateFilter || searchTerm
                ? 'No appointments match your filters. Try adjusting your search criteria.'
                : 'Get started by scheduling your first appointment.'
              }
            </p>
            <div className="mt-6">
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={() => setShowScheduleModal(true)}
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Schedule Appointment
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Schedule Appointment Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={() => !isSubmitting && setShowScheduleModal(false)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            {/* Modal panel */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div 
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-headline"
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                      Schedule New Appointment
                    </h3>
                    
                    {/* Error message */}
                    {scheduleError && (
                      <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-700">{scheduleError}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      {/* Form fields */}
                      <form id="appointment-form" className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                          <label htmlFor="shop-name" className="block text-sm font-medium text-gray-700">
                            Repair Shop *
                          </label>
                          <input
                            type="text"
                            name="shop-name"
                            id="shop-name"
                            required
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="Enter shop name"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="mechanic-name" className="block text-sm font-medium text-gray-700">
                            Mechanic Name *
                          </label>
                          <input
                            type="text"
                            name="mechanic-name"
                            id="mechanic-name"
                            required
                            value={mechanicName}
                            onChange={(e) => setMechanicName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="Enter mechanic name"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="appointment-date" className="block text-sm font-medium text-gray-700">
                              Date *
                            </label>
                            <input
                              type="date"
                              name="appointment-date"
                              id="appointment-date"
                              required
                              value={appointmentDate}
                              onChange={(e) => setAppointmentDate(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="appointment-time" className="block text-sm font-medium text-gray-700">
                              Time *
                            </label>
                            <input
                              type="time"
                              name="appointment-time"
                              id="appointment-time"
                              required
                              value={appointmentTime}
                              onChange={(e) => setAppointmentTime(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="vehicle" className="block text-sm font-medium text-gray-700">
                            Vehicle *
                          </label>
                          <input
                            type="text"
                            name="vehicle"
                            id="vehicle"
                            required
                            value={vehicle}
                            onChange={(e) => setVehicle(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="Enter vehicle details (e.g. 2020 Honda Civic)"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Services *
                          </label>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <input
                                id="oil-change"
                                name="services"
                                type="checkbox"
                                checked={services.includes('Oil Change')}
                                onChange={(e) => handleServiceChange('Oil Change', e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <label htmlFor="oil-change" className="ml-2 block text-sm text-gray-700">
                                Oil Change
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="tire-rotation"
                                name="services"
                                type="checkbox"
                                checked={services.includes('Tire Rotation')}
                                onChange={(e) => handleServiceChange('Tire Rotation', e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <label htmlFor="tire-rotation" className="ml-2 block text-sm text-gray-700">
                                Tire Rotation
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="brake-inspection"
                                name="services"
                                type="checkbox"
                                checked={services.includes('Brake Inspection')}
                                onChange={(e) => handleServiceChange('Brake Inspection', e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <label htmlFor="brake-inspection" className="ml-2 block text-sm text-gray-700">
                                Brake Inspection
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="engine-diagnostic"
                                name="services"
                                type="checkbox"
                                checked={services.includes('Engine Diagnostic')}
                                onChange={(e) => handleServiceChange('Engine Diagnostic', e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <label htmlFor="engine-diagnostic" className="ml-2 block text-sm text-gray-700">
                                Engine Diagnostic
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="battery-replacement"
                                name="services"
                                type="checkbox"
                                checked={services.includes('Battery Replacement')}
                                onChange={(e) => handleServiceChange('Battery Replacement', e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <label htmlFor="battery-replacement" className="ml-2 block text-sm text-gray-700">
                                Battery Replacement
                              </label>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                            Notes
                          </label>
                          <textarea
                            id="notes"
                            name="notes"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="Any special requests or additional information"
                          />
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-2">
                          * Required fields
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  form="appointment-form"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Scheduling...
                    </div>
                  ) : "Schedule"}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowScheduleModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Schedule Success Modal */}
      {showScheduleSuccessModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={() => setShowScheduleSuccessModal(false)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            {/* Modal panel */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div 
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-headline"
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                      Appointment Scheduled
                    </h3>
                    
                    <div className="mt-4 flex items-center justify-center">
                      <svg className="h-16 w-16 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L10 11.414l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        Your appointment has been successfully scheduled.
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        We'll send you a confirmation email shortly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowScheduleSuccessModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}