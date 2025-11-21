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
  created_at: string;
  updated_at: string;
};
