import { format } from 'date-fns'
import { useState } from 'react'

interface Appointment {
  id: string
  shopName: string
  mechanicName: string
  date: string
  time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  services: string[]
  vehicle: string
}

interface AppointmentCardProps {
  appointment: Appointment
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const { shopName, mechanicName, date, time, status, services, vehicle } = appointment
  
  // Format date to be more readable
  const formattedDate = format(new Date(date), 'EEEE, MMMM do, yyyy')
  
  // Status color mapping
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  }
  
  // Modal state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showRescheduleConfirmModal, setShowRescheduleConfirmModal] = useState(false)
  const [showCancelSuccessModal, setShowCancelSuccessModal] = useState(false)
  const [showRescheduleSuccessModal, setShowRescheduleSuccessModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [isCancellingSuccess, setIsCancellingSuccess] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  
  // Reschedule form state
  const [rescheduleDate, setRescheduleDate] = useState(date)
  const [rescheduleTime, setRescheduleTime] = useState(time)
  
  // Handle cancel appointment
  const handleCancelAppointment = async () => {
    setIsCancelling(true)
    setCancelError(null)
    
    try {
      // Call API to cancel appointment
      await appointmentsApi.cancelAppointment(appointment.id)
      
      // Close modal
      setShowCancelModal(false)
      
      // Show success modal
      setIsCancellingSuccess(true)
      setShowCancelSuccessModal(true)
      
      // In a real app, you would refresh the appointments list or update the UI
      console.log('Appointment cancelled successfully')
    } catch (err) {
      setCancelError('Failed to cancel appointment. Please try again.')
      console.error('Error cancelling appointment:', err)
    } finally {
      setIsCancelling(false)
    }
  }
  
  // Handle reschedule appointment
  const handleRescheduleAppointment = async () => {
    setIsRescheduling(true)
    setRescheduleError(null)
    
    try {
      // Call API to reschedule appointment
      const updatedAppointment = await appointmentsApi.updateAppointment(
        appointment.id,
        {
          date: rescheduleDate,
          time: rescheduleTime
        }
      )
      
      // Close modals
      setShowRescheduleModal(false)
      setShowRescheduleConfirmModal(false)
      
      // Show success modal
      setShowRescheduleSuccessModal(true)
      
      // Hide success modal after 3 seconds
      setTimeout(() => {
        setShowRescheduleSuccessModal(false)
      }, 3000)
      
      // Reset form
      setRescheduleDate(date)
      setRescheduleTime(time)
      
      // In a real app, you would refresh the appointments list or update the UI
      console.log('Appointment rescheduled successfully:', updatedAppointment)
    } catch (err) {
      setRescheduleError('Failed to reschedule appointment. Please try again.')
      console.error('Error rescheduling appointment:', err)
    } finally {
      setIsRescheduling(false)
    }
  }
  
  // Handle service checkbox changes
  const handleServiceChange = (service: string, checked: boolean) => {
    if (checked) {
      setServices([...services, service])
    } else {
      setServices(services.filter(s => s !== service))
    }
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h3 className="text-lg font-semibold text-gray-900">{shopName}</h3>
            <p className="text-sm text-gray-600">with {mechanicName}</p>
          </div>
          
          <div className="flex flex-col items-start md:items-end">
            <p className="text-sm text-gray-600">{formattedDate}</p>
            <p className="text-sm text-gray-600">{time}</p>
            <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Vehicle:</h4>
          <p className="text-sm text-gray-600 mb-4">{vehicle}</p>
          
          <h4 className="text-sm font-medium text-gray-900 mb-2">Services:</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {services.map((service, index) => (
              <li key={index}>{service}</li>
            ))}
          </ul>
        </div>
        
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {status === 'pending' && (
            <button
              type="button"
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Confirm Appointment
            </button>
          )}
          
          {status === 'confirmed' && (
            <button
              type="button"
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => setShowRescheduleModal(true)}
            >
              View Details
            </button>
          )}
          
          {status !== 'cancelled' && (
            <button
              type="button"
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={() => setShowRescheduleModal(true)}
            >
              Reschedule
            </button>
          )}
          
          {status !== 'cancelled' && (
            <button
              type="button"
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              onClick={() => setShowCancelModal(true)}
            >
              Cancel Appointment
            </button>
          )}
        </div>
      </div>
      
      {/* Cancel Appointment Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={() => !isCancelling && setShowCancelModal(false)}
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
                      Cancel Appointment
                    </h3>
                    
                    {/* Error message */}
                    {cancelError && (
                      <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293-1.293a1 1 0 00-1.414-1.414L9 10l1.293-1.293a1 1 0 00-1.414-1.414L8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-700">{cancelError}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to cancel this appointment with {shopName} on {formattedDate} at {time}?
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCancelAppointment}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Cancelling...
                    </div>
                  ) : "Cancel Appointment"}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                >
                  Keep Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Cancel Success Modal */}
      {showCancelSuccessModal && isCancellingSuccess && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={() => {
                setIsCancellingSuccess(false)
                setShowCancelSuccessModal(false)
              }}
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
                      Appointment Cancelled
                    </h3>
                    
                    <div className="mt-4 flex items-center justify-center">
                      <svg className="h-16 w-16 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 001.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        Your appointment with {shopName} on {formattedDate} at {time} has been successfully cancelled.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setIsCancellingSuccess(false)
                    setShowCancelSuccessModal(false)
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reschedule Appointment Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={() => !isRescheduling && setShowRescheduleModal(false)}
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
                      Reschedule Appointment
                    </h3>
                    
                    {/* Error message */}
                    {rescheduleError && (
                      <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-700">{rescheduleError}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <form onSubmit={(e) => { e.preventDefault(); setShowRescheduleConfirmModal(true); }}>
                        <p className="text-sm text-gray-500 mb-4">
                          Reschedule your appointment with {shopName}:
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="reschedule-date" className="block text-sm font-medium text-gray-700">
                              New Date
                            </label>
                            <input
                              type="date"
                              name="reschedule-date"
                              id="reschedule-date"
                              required
                              value={rescheduleDate}
                              onChange={(e) => setRescheduleDate(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="reschedule-time" className="block text-sm font-medium text-gray-700">
                              New Time
                            </label>
                            <input
                              type="time"
                              name="reschedule-time"
                              id="reschedule-time"
                              required
                              value={rescheduleTime}
                              onChange={(e) => setRescheduleTime(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                          <button
                            type="submit"
                            className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Continue
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reschedule Confirmation Modal */}
      {showRescheduleConfirmModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={() => !isRescheduling && setShowRescheduleConfirmModal(false)}
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
                      Confirm Rescheduling
                    </h3>
                    
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to reschedule your appointment with {shopName} to {format(new Date(rescheduleDate), 'EEEE, MMMM do, yyyy')} at {rescheduleTime}?
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleRescheduleAppointment}
                  disabled={isRescheduling}
                >
                  {isRescheduling ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Rescheduling...
                    </div>
                  ) : "Reschedule"}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowRescheduleConfirmModal(false)}
                  disabled={isRescheduling}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reschedule Success Modal */}
      {showRescheduleSuccessModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={() => setShowRescheduleSuccessModal(false)}
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
                      Appointment Rescheduled
                    </h3>
                    
                    <div className="mt-4 flex items-center justify-center">
                      <svg className="h-16 w-16 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 001.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        Your appointment with {shopName} has been successfully rescheduled to {format(new Date(rescheduleDate), 'EEEE, MMMM do, yyyy')} at {rescheduleTime}.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowRescheduleSuccessModal(false)}
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