/*
  # Enhance CRM with Customer Profiles and Notes

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text) - Customer name
      - `email` (text) - Customer email
      - `phone` (text) - Customer phone
      - `address` (text) - Customer address
      - `notes` (text) - Mechanic notes about customer preferences
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `vehicles`
      - `id` (uuid, primary key)
      - `customer_id` (uuid) - Foreign key to customers
      - `make` (text) - Vehicle make
      - `model` (text) - Vehicle model
      - `year` (integer) - Vehicle year
      - `vin` (text) - Vehicle identification number
      - `license_plate` (text) - License plate number
      - `color` (text) - Vehicle color
      - `mileage` (integer) - Current mileage
      - `last_service_date` (timestamptz) - Last service date
      - `next_service_due` (timestamptz) - Next service due date
      - `notes` (text) - Mechanic notes about vehicle
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on customers and vehicles tables
    - Add policies for read/write access
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  vin TEXT,
  license_plate TEXT,
  color TEXT,
  mileage INTEGER,
  last_service_date TIMESTAMPTZ,
  next_service_due TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Repair shops can manage customers"
  ON customers FOR ALL
  USING (
    TRUE
  );

CREATE POLICY "Anyone can view customers"
  ON customers FOR SELECT
  USING (true);

-- RLS Policies for vehicles
CREATE POLICY "Repair shops can manage vehicles"
  ON vehicles FOR ALL
  USING (
    TRUE
  );

CREATE POLICY "Anyone can view vehicles"
  ON vehicles FOR SELECT
  USING (true);

-- Populate customers table with existing data from appointments
INSERT INTO customers (name, email, phone, created_at, updated_at)
SELECT DISTINCT 
  customer_name, 
  customer_email, 
  customer_phone,
  MIN(created_at),
  MAX(updated_at)
FROM appointments 
WHERE customer_name IS NOT NULL AND customer_email IS NOT NULL
GROUP BY customer_name, customer_email, customer_phone
ON CONFLICT DO NOTHING;

-- Populate vehicles table with existing data from appointments
INSERT INTO vehicles (customer_id, make, model, year, created_at, updated_at)
SELECT 
  c.id,
  a.vehicle_make,
  a.vehicle_model,
  a.vehicle_year,
  MIN(a.created_at),
  MAX(a.updated_at)
FROM appointments a
JOIN customers c ON c.name = a.customer_name AND c.email = a.customer_email
WHERE a.vehicle_make IS NOT NULL AND a.vehicle_model IS NOT NULL AND a.vehicle_year IS NOT NULL
GROUP BY c.id, a.vehicle_make, a.vehicle_model, a.vehicle_year
ON CONFLICT DO NOTHING;