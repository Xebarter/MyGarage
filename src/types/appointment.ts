export interface Appointment {
  id: string;
  shopName: string;
  mechanicName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  services: string[];
  vehicle: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
