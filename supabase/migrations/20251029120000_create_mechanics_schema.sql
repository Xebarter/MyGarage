/*
  # Create Mechanics Schema

  1. New Tables
    - `mechanics`
      - `id` (uuid, primary key)
      - `repair_shop_id` (uuid) - Foreign key to repair_shops
      - `first_name` (text) - Mechanic's first name
      - `last_name` (text) - Mechanic's last name
      - `email` (text) - Mechanic's email
      - `phone` (text) - Mechanic's phone number
      - `bio` (text) - Mechanic's biography
      - `certifications` (text[]) - Array of mechanic certifications
      - `specializations` (text[]) - Array of mechanic specializations
      - `years_of_experience` (integer) - Years of experience
      - `hourly_rate` (numeric) - Hourly rate for services
      - `profile_image_url` (text) - Mechanic's profile image
      - `is_active` (boolean) - Whether mechanic is currently working
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `mechanic_working_hours`
      - `id` (uuid, primary key)
      - `mechanic_id` (uuid) - Foreign key to mechanics
      - `day_of_week` (integer) - Day of week (0-6, Sunday-Saturday)
      - `start_time` (time) - Start time of shift
      - `end_time` (time) - End time of shift
      - `is_available` (boolean) - Whether mechanic is available on this day
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `mechanic_appointments`
      - `id` (uuid, primary key)
      - `mechanic_id` (uuid) - Foreign key to mechanics
      - `appointment_id` (uuid) - Foreign key to appointments
      - `service_id` (uuid) - Foreign key to services
      - `status` (text) - Status of mechanic's work on appointment
      - `notes` (text) - Notes from mechanic
      - `start_time` (timestamptz) - Actual start time of work
      - `end_time` (timestamptz) - Actual end time of work
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Enhanced Tables
    - `appointments`
      - Add `assigned_mechanic_id` (uuid) - Foreign key to mechanics

  3. Security
    - Enable RLS on all new tables
    - Add policies for appropriate access control
*/

-- Create mechanics table
CREATE TABLE IF NOT EXISTS mechanics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_shop_id UUID REFERENCES repair_shops(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  bio TEXT,
  certifications TEXT[] DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}',
  years_of_experience INTEGER DEFAULT 0,
  hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
  profile_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mechanic_working_hours table
CREATE TABLE IF NOT EXISTS mechanic_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mechanic_appointments table
CREATE TABLE IF NOT EXISTS mechanic_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add assigned_mechanic_id column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS assigned_mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mechanics_repair_shop_id ON mechanics(repair_shop_id);
CREATE INDEX IF NOT EXISTS idx_mechanics_email ON mechanics(email);
CREATE INDEX IF NOT EXISTS idx_mechanic_working_hours_mechanic_id ON mechanic_working_hours(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_working_hours_day ON mechanic_working_hours(day_of_week);
CREATE INDEX IF NOT EXISTS idx_mechanic_appointments_mechanic_id ON mechanic_appointments(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_appointments_appointment_id ON mechanic_appointments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_appointments_service_id ON mechanic_appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_mechanic_id ON appointments(assigned_mechanic_id);

-- Enable Row Level Security
ALTER TABLE mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mechanics
CREATE POLICY "Mechanics are viewable by repair shop owners and admins"
  ON mechanics FOR SELECT
  USING (
    repair_shop_id IN (
      SELECT id FROM repair_shops WHERE id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM repair_shops WHERE id = repair_shops.id AND auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "Repair shop owners can create mechanics"
  ON mechanics FOR INSERT
  WITH CHECK (
    repair_shop_id IN (
      SELECT id FROM repair_shops WHERE id = auth.uid()
    )
  );

CREATE POLICY "Repair shop owners can update their mechanics"
  ON mechanics FOR UPDATE
  USING (
    repair_shop_id IN (
      SELECT id FROM repair_shops WHERE id = auth.uid()
    )
  );

CREATE POLICY "Repair shop owners can delete their mechanics"
  ON mechanics FOR DELETE
  USING (
    repair_shop_id IN (
      SELECT id FROM repair_shops WHERE id = auth.uid()
    )
  );

-- RLS Policies for mechanic_working_hours
CREATE POLICY "Working hours are viewable by mechanic owner and repair shop"
  ON mechanic_working_hours FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM mechanics m 
      JOIN repair_shops rs ON m.repair_shop_id = rs.id 
      WHERE m.id = mechanic_id AND rs.id = auth.uid()
    )
  );

CREATE POLICY "Mechanics can manage their own working hours"
  ON mechanic_working_hours FOR ALL
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE id = auth.uid()
    )
  );

-- RLS Policies for mechanic_appointments
CREATE POLICY "Mechanic appointments are viewable by related parties"
  ON mechanic_appointments FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE id = auth.uid()
    ) OR
    appointment_id IN (
      SELECT id FROM appointments WHERE id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM mechanics m 
      JOIN repair_shops rs ON m.repair_shop_id = rs.id 
      WHERE m.id = mechanic_id AND rs.id = auth.uid()
    )
  );

CREATE POLICY "Mechanics can manage their own appointments"
  ON mechanic_appointments FOR ALL
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE id = auth.uid()
    )
  );

-- RLS Policies for appointments (update to include mechanic access)
DROP POLICY IF EXISTS "Authenticated can view appointments" ON public.appointments;
CREATE POLICY "Authenticated can view appointments"
  ON public.appointments FOR SELECT
  USING (
    auth.uid() IS NOT NULL OR
    assigned_mechanic_id IN (
      SELECT id FROM mechanics WHERE id = auth.uid()
    )
  );

-- Create function to get mechanic availability
CREATE OR REPLACE FUNCTION get_mechanic_availability(mechanic_id UUID, check_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
  is_available BOOLEAN;
  day_of_week INTEGER;
BEGIN
  day_of_week := EXTRACT(DOW FROM check_date);
  
  SELECT mwh.is_available INTO is_available
  FROM mechanic_working_hours mwh
  WHERE mwh.mechanic_id = get_mechanic_availability.mechanic_id
  AND mwh.day_of_week = day_of_week;
  
  RETURN COALESCE(is_available, false);
END;
$$ LANGUAGE plpgsql;

-- Create function to get available mechanics for a repair shop
CREATE OR REPLACE FUNCTION get_available_mechanics_for_shop(
  shop_id UUID, 
  check_date DATE
)
RETURNS TABLE(
  mechanic_id UUID,
  first_name TEXT,
  last_name TEXT,
  specializations TEXT[]
) AS $$
DECLARE
  day_of_week INTEGER;
BEGIN
  day_of_week := EXTRACT(DOW FROM check_date);
  
  RETURN QUERY
  SELECT 
    m.id,
    m.first_name,
    m.last_name,
    m.specializations
  FROM mechanics m
  JOIN mechanic_working_hours mwh ON m.id = mwh.mechanic_id
  WHERE m.repair_shop_id = shop_id
  AND m.is_active = true
  AND mwh.day_of_week = day_of_week
  AND mwh.is_available = true;
END;
$$ LANGUAGE plpgsql;

-- Create view for mechanic profiles with repair shop info
CREATE OR REPLACE VIEW mechanic_profiles AS
SELECT 
  m.id,
  m.first_name,
  m.last_name,
  m.email,
  m.phone,
  m.bio,
  m.certifications,
  m.specializations,
  m.years_of_experience,
  m.hourly_rate,
  m.profile_image_url,
  m.is_active,
  rs.id as repair_shop_id,
  rs.name as repair_shop_name,
  rs.city as repair_shop_city,
  rs.state as repair_shop_state
FROM mechanics m
JOIN repair_shops rs ON m.repair_shop_id = rs.id
WHERE m.is_active = true;

-- Insert sample mechanics data
INSERT INTO mechanics (
  repair_shop_id,
  first_name,
  last_name,
  email,
  phone,
  bio,
  certifications,
  specializations,
  years_of_experience,
  hourly_rate,
  profile_image_url,
  is_active
) 
SELECT 
  rs.id as repair_shop_id,
  'John',
  'Smith',
  'john.smith@example.com',
  '(555) 123-4567',
  'Master mechanic with over 15 years of experience specializing in European cars.',
  ARRAY['ASE Master Technician', 'Hybrid Specialist']::TEXT[],
  ARRAY['Engine Repair', 'Transmission', 'Electrical Systems']::TEXT[],
  15,
  75.00,
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
  true
FROM repair_shops rs 
WHERE rs.name = 'Premium Auto Service'
LIMIT 1;

INSERT INTO mechanics (
  repair_shop_id,
  first_name,
  last_name,
  email,
  phone,
  bio,
  certifications,
  specializations,
  years_of_experience,
  hourly_rate,
  profile_image_url,
  is_active
) 
SELECT 
  rs.id as repair_shop_id,
  'Maria',
  'Garcia',
  'maria.garcia@example.com',
  '(555) 234-5678',
  'Certified technician specializing in brake systems and general maintenance.',
  ARRAY['ASE Brakes Specialist', 'ASE Maintenance & Lt. Repair']::TEXT[],
  ARRAY['Brake Services', 'Oil Changes', 'Tire Services']::TEXT[],
  8,
  60.00,
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
  true
FROM repair_shops rs 
WHERE rs.name = 'Quick Fix Mechanics'
LIMIT 1;

-- Insert sample working hours
INSERT INTO mechanic_working_hours (
  mechanic_id,
  day_of_week,
  start_time,
  end_time,
  is_available
)
SELECT 
  m.id,
  generate_series(1, 5) as day_of_week, -- Monday to Friday
  '08:00:00'::TIME as start_time,
  '18:00:00'::TIME as end_time,
  true as is_available
FROM mechanics m
WHERE m.email = 'john.smith@example.com';

INSERT INTO mechanic_working_hours (
  mechanic_id,
  day_of_week,
  start_time,
  end_time,
  is_available
)
SELECT 
  m.id,
  generate_series(1, 6) as day_of_week, -- Monday to Saturday
  '07:00:00'::TIME as start_time,
  '19:00:00'::TIME as end_time,
  true as is_available
FROM mechanics m
WHERE m.email = 'maria.garcia@example.com';