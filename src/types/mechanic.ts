export interface Mechanic {
  id: string;
  repair_shop_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  bio?: string;
  certifications: string[];
  specializations: string[];
  years_of_experience: number;
  hourly_rate: number;
  profile_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MechanicWorkingHour {
  id: string;
  mechanic_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // ISO time format
  end_time: string; // ISO time format
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface MechanicAppointment {
  id: string;
  mechanic_id: string;
  appointment_id: string;
  service_id?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  start_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

export interface MechanicProfile extends Mechanic {
  repair_shop_name: string;
  repair_shop_city: string;
  repair_shop_state: string;
}

export interface AppointmentWithMechanic extends Appointment {
  assigned_mechanic_id?: string;
  mechanic?: Mechanic;
}