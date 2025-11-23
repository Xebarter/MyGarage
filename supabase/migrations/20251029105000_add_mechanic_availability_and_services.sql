/*
  # Add Mechanic Availability and Services Schema

  1. Alter repair_shops table
    - Add `availability_status` column (text) - Values: 'available', 'busy', 'offline'

  2. New Tables
    - `service_categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name
      - `description` (text) - Category description
      - `created_at` (timestamptz)
    
    - `services`
      - `id` (uuid, primary key)
      - `repair_shop_id` (uuid) - Foreign key to repair_shops
      - `category_id` (uuid) - Foreign key to service_categories
      - `name` (text) - Service name
      - `description` (text) - Service description
      - `price` (numeric) - Service price
      - `duration_minutes` (integer) - Estimated duration in minutes
      - `featured` (boolean) - Whether service is featured
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS on service_categories and services tables
    - Add policies for read access and authenticated write access
*/

-- Add availability_status column to repair_shops
ALTER TABLE repair_shops 
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'offline' 
CHECK (availability_status IN ('available', 'busy', 'offline'));

-- Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_shop_id UUID REFERENCES repair_shops(id) ON DELETE CASCADE,
  category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  duration_minutes INTEGER DEFAULT 60,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_categories
CREATE POLICY "Anyone can view service categories"
  ON service_categories FOR SELECT
  USING (true);

-- RLS Policies for services
CREATE POLICY "Anyone can view services"
  ON services FOR SELECT
  USING (true);

CREATE POLICY "Repair shops can manage their own services"
  ON services FOR ALL
  USING (repair_shop_id IN (
    SELECT id FROM repair_shops WHERE id = auth.uid()
  ));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_services_repair_shop_id ON services(repair_shop_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);

-- Insert default service categories
INSERT INTO service_categories (name, description) VALUES
  ('Engine Repair', 'Services related to engine diagnosis, repair, and replacement'),
  ('Electrical Work', 'Electrical system diagnostics and repairs including wiring, alternators, starters, etc.'),
  ('Diagnostics', 'Vehicle diagnostic services using specialized equipment'),
  ('Tire Services', 'Tire sales, installation, rotation, balancing, and repair'),
  ('Brake Services', 'Brake pad replacement, rotor resurfacing, brake fluid flushes, and brake system repairs'),
  ('Transmission', 'Transmission services including fluid changes, repairs, and replacements'),
  ('Suspension', 'Shock absorber replacement, strut repair, and suspension system services'),
  ('AC Services', 'Air conditioning repair, recharge, and maintenance'),
  ('Oil Change', 'Regular oil changes with synthetic and conventional oils'),
  ('Exhaust Systems', 'Muffler replacement, exhaust leak repairs, catalytic converter services')
ON CONFLICT (name) DO NOTHING;