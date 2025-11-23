import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Category = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  created_at: string;
};

export type Part = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  sku: string;
  brand: string;
  compatible_models: string;
  image_url: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

export type CartItem = {
  part: Part;
  quantity: number;
};

export type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  created_at: string;
};

export type RepairShop = {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
  latitude: number;
  longitude: number;
  rating: number;
  specialties: string;
  hours: string;
  image_url: string;
  verified: boolean;
  availability_status: 'available' | 'busy' | 'offline';
  created_at: string;
  updated_at: string;
};

export type ServiceCategory = {
  id: string;
  name: string;
  description: string;
  created_at: string;
};

export type Service = {
  id: string;
  repair_shop_id: string;
  category_id: string | null;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

export type ServicePart = {
  id: string;
  service_id: string;
  part_id: string;
  quantity: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type Vehicle = {
  id: string;
  customer_id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  license_plate: string;
  color: string;
  mileage: number;
  last_service_date: string;
  next_service_due: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  customer_id: string;
  repair_shop_id: string;
  subject: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'customer' | 'repair_shop';
  content: string;
  read_at: string;
  created_at: string;
};

export type MessageMedia = {
  id: string;
  message_id: string;
  media_type: 'image' | 'video';
  media_url: string;
  thumbnail_url: string;
  created_at: string;
};
