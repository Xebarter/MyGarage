import { Appointment } from '@/types/appointment'

// Mock API service for appointments
export const appointmentsApi = {
  // Get all appointments
  getAllAppointments: async (): Promise<Appointment[]> => {
    // In a real application, this would be an API call to your backend
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            shopName: 'City Auto Repair',
            mechanicName: 'John Smith',
            date: '2023-09-20',
            time: '10:00',
            status: 'pending',
            services: ['Oil Change', 'Tire Rotation'],
            vehicle: '2018 Toyota Camry',
          },
          {
            id: '2',
            shopName: 'Metro Car Care',
            mechanicName: 'Sarah Johnson',
            date: '2023-09-18',
            time: '14:30',
            status: 'confirmed',
            services: ['Brake Inspection', 'Engine Diagnostic'],
            vehicle: '2020 Honda Civic',
          },
          {
            id: '3',
            shopName: 'Quick Lube',
            mechanicName: 'Mike Williams',
            date: '2023-09-15',
            time: '09:00',
            status: 'completed',
            services: ['Oil Change', 'Battery Replacement'],
            vehicle: '2016 Ford F-150',
          }
        ])
      }, 500)
    })
  },

  // Get a single appointment by ID
  getAppointment: async (id: string): Promise<Appointment> => {
    // In a real application, this would be an API call to your backend
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const appointment = {
          id: '1',
          shopName: 'City Auto Repair',
          mechanicName: 'John Smith',
          date: '2023-09-20',
          time: '10:00',
          status: 'pending',
          services: ['Oil Change', 'Tire Rotation'],
          vehicle: '2018 Toyota Camry',
        }
        
        if (appointment.id === id) {
          resolve(appointment)
        } else {
          reject(new Error(`Appointment with id ${id} not found`))
        }
      }, 500)
    })
  },

  // Create a new appointment
  createAppointment: async (appointmentData: Omit<Appointment, 'id' | 'status'>): Promise<Appointment> => {
    // In a real application, this would be an API call to create a new appointment on the server
    return new Promise((resolve) => {
      setTimeout(() => {
        const newAppointment = {
          id: Math.random().toString(36).substr(2, 9),
          ...appointmentData,
          status: 'pending' as const,
        }
        
        // In a real app, you would get the newly created appointment from the server
        resolve(newAppointment)
      }, 500)
    })
  },

  // Update an existing appointment
  updateAppointment: async (id: string, updateData: Partial<Appointment>): Promise<Appointment> => {
    // In a real application, this would be an API call to update an existing appointment on the server
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // In a real app, you would get the updated appointment from the server
        const updatedAppointment = {
          id: '1',
          shopName: 'City Auto Repair',
          mechanicName: 'John Smith',
          date: '2023-09-20',
          time: '10:00',
          status: 'pending',
          services: ['Oil Change', 'Tire Rotation'],
          vehicle: '2018 Toyota Camry',
        }
        
        if (updatedAppointment.id === id) {
          resolve({ ...updatedAppointment, ...updateData })
        } else {
          reject(new Error(`Appointment with id ${id} not found`))
        }
      }, 500)
    })
  },

  // Cancel an appointment
  cancelAppointment: async (id: string): Promise<{ success: boolean }> => {
    // In a real application, this would be an API call to cancel an appointment
    return new Promise((resolve) => {
      setTimeout(() => {
        // In a real app, you would get the updated appointment from the server
        resolve({ success: true })
      }, 500)
    })
  }
}