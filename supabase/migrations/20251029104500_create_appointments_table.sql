/*
  # Add Appointments Schema

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key)
      - `customer_name` (text) - Customer's name
      - `customer_email` (text) - Customer's email
      - `customer_phone` (text) - Customer's phone number
      - `appointment_date` (timestamptz) - Scheduled appointment date and time
      - `service_type` (text) - Type of service requested
      - `vehicle_make` (text) - Vehicle make
      - `vehicle_model` (text) - Vehicle model
      - `vehicle_year` (integer) - Vehicle year
      - `notes` (text) - Additional notes from customer
      - `status` (text) - Appointment status (scheduled, completed, cancelled)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on appointments table
    - Add policies for public create access and authenticated read access
*/

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  appointment_date timestamptz NOT NULL,
  service_type text NOT NULL,
  vehicle_make text NOT NULL,
  vehicle_model text NOT NULL,
  vehicle_year integer NOT NULL,
  notes text,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
CREATE POLICY "Anyone can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated can view appointments"
  ON appointments FOR SELECT
  USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);