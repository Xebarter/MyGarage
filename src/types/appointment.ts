import { Mechanic } from "./mechanic";

export interface Appointment {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  appointment_date: string;
  service_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  notes?: string;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'declined';
  reminder_sent: boolean;
  assigned_mechanic_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithMechanic extends Appointment {
  mechanic?: Mechanic;
}