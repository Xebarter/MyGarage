/*
  # Add Repair Shops Schema

  1. New Tables
    - `repair_shops`
      - `id` (uuid, primary key)
      - `name` (text) - Shop name
      - `description` (text) - Shop description
      - `address` (text) - Full address
      - `city` (text) - City
      - `state` (text) - State/Province
      - `zip_code` (text) - ZIP/Postal code
      - `phone` (text) - Contact phone
      - `email` (text) - Contact email
      - `website` (text) - Website URL
      - `latitude` (numeric) - GPS latitude coordinate
      - `longitude` (numeric) - GPS longitude coordinate
      - `rating` (numeric) - Average rating (0-5)
      - `specialties` (text) - Comma-separated specialties
      - `hours` (text) - Business hours
      - `image_url` (text) - Shop image
      - `verified` (boolean) - Whether shop is verified
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on repair_shops table
    - Add policy for public read access

  3. Sample Data
    - Insert sample repair shops with realistic locations
*/

-- Create repair_shops table
CREATE TABLE IF NOT EXISTS repair_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  latitude numeric(10, 8) NOT NULL,
  longitude numeric(11, 8) NOT NULL,
  rating numeric(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  specialties text DEFAULT '',
  hours text DEFAULT '',
  image_url text DEFAULT '',
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE repair_shops ENABLE ROW LEVEL SECURITY;

-- RLS Policy for repair_shops (public read access)
CREATE POLICY "Anyone can view repair shops"
  ON repair_shops FOR SELECT
  USING (true);

-- Insert sample repair shops (using coordinates around major cities)
INSERT INTO repair_shops (name, description, address, city, state, zip_code, phone, email, website, latitude, longitude, rating, specialties, hours, image_url, verified) VALUES
  (
    'Premium Auto Service',
    'Full-service automotive repair with certified technicians. Specializing in foreign and domestic vehicles.',
    '1234 Main Street',
    'Los Angeles',
    'CA',
    '90001',
    '(555) 123-4567',
    'info@premiumauto.com',
    'https://premiumauto.com',
    34.0522,
    -118.2437,
    4.8,
    'Engine Repair, Brake Service, Transmission, AC Repair',
    'Mon-Fri: 8AM-6PM, Sat: 9AM-4PM',
    'https://images.pexels.com/photos/4489735/pexels-photo-4489735.jpeg?auto=compress&cs=tinysrgb&w=800',
    true
  ),
  (
    'Quick Fix Mechanics',
    'Fast and affordable auto repairs with a satisfaction guarantee. Same-day service available.',
    '5678 Oak Avenue',
    'Los Angeles',
    'CA',
    '90015',
    '(555) 234-5678',
    'service@quickfix.com',
    'https://quickfix.com',
    34.0407,
    -118.2468,
    4.5,
    'Oil Changes, Tire Service, Brake Inspection, Diagnostics',
    'Mon-Sat: 7AM-7PM, Sun: 9AM-3PM',
    'https://images.pexels.com/photos/3806288/pexels-photo-3806288.jpeg?auto=compress&cs=tinysrgb&w=800',
    true
  ),
  (
    'Elite European Motors',
    'Specialized service for BMW, Mercedes, Audi, and other European vehicles. Factory-trained technicians.',
    '9012 Sunset Boulevard',
    'Los Angeles',
    'CA',
    '90069',
    '(555) 345-6789',
    'contact@eliteeuropean.com',
    'https://eliteeuropean.com',
    34.0901,
    -118.3709,
    4.9,
    'European Cars, Performance Tuning, Electrical Systems',
    'Mon-Fri: 8AM-5PM',
    'https://images.pexels.com/photos/4489464/pexels-photo-4489464.jpeg?auto=compress&cs=tinysrgb&w=800',
    true
  ),
  (
    'City Center Auto Repair',
    'Trusted neighborhood mechanic serving the community for over 20 years. Honest and transparent pricing.',
    '2345 Broadway',
    'New York',
    'NY',
    '10024',
    '(555) 456-7890',
    'hello@citycenterauto.com',
    'https://citycenterauto.com',
    40.7831,
    -73.9712,
    4.6,
    'General Repair, Suspension, Exhaust Systems, State Inspections',
    'Mon-Fri: 7:30AM-6PM, Sat: 8AM-2PM',
    'https://images.pexels.com/photos/3806387/pexels-photo-3806387.jpeg?auto=compress&cs=tinysrgb&w=800',
    true
  ),
  (
    'Tech Auto Solutions',
    'Modern automotive service center with advanced diagnostic equipment. Hybrid and electric vehicle specialists.',
    '7890 Market Street',
    'San Francisco',
    'CA',
    '94102',
    '(555) 567-8901',
    'info@techauto.com',
    'https://techauto.com',
    37.7749,
    -122.4194,
    4.7,
    'Hybrid/Electric Vehicles, Computer Diagnostics, Engine Performance',
    'Mon-Sat: 8AM-6PM',
    'https://images.pexels.com/photos/4489702/pexels-photo-4489702.jpeg?auto=compress&cs=tinysrgb&w=800',
    true
  ),
  (
    'Express Tire & Service',
    'Quick tire changes, wheel alignment, and basic maintenance. No appointment necessary.',
    '3456 Lake Shore Drive',
    'Chicago',
    'IL',
    '60611',
    '(555) 678-9012',
    'service@expresstire.com',
    'https://expresstire.com',
    41.8781,
    -87.6298,
    4.4,
    'Tires, Wheel Alignment, Oil Changes, Batteries',
    'Mon-Sat: 7AM-8PM, Sun: 9AM-5PM',
    'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=800',
    true
  ),
  (
    'Complete Auto Care',
    'Full-service automotive center offering repairs, maintenance, and body work. Shuttle service available.',
    '4567 Main Street',
    'Houston',
    'TX',
    '77002',
    '(555) 789-0123',
    'contact@completeautocare.com',
    'https://completeautocare.com',
    29.7604,
    -95.3698,
    4.6,
    'Full Service, Body Work, Paint, Collision Repair',
    'Mon-Fri: 7AM-6PM, Sat: 8AM-4PM',
    'https://images.pexels.com/photos/13065690/pexels-photo-13065690.jpeg?auto=compress&cs=tinysrgb&w=800',
    true
  ),
  (
    'Performance Plus Garage',
    'Performance upgrades and custom modifications. Track-tested solutions for enthusiasts.',
    '5678 Racing Way',
    'Miami',
    'FL',
    '33101',
    '(555) 890-1234',
    'info@performanceplus.com',
    'https://performanceplus.com',
    25.7617,
    -80.1918,
    4.8,
    'Performance Upgrades, Custom Exhaust, Turbo Installation, Tuning',
    'Tue-Sat: 9AM-6PM',
    'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800',
    true
  )
ON CONFLICT DO NOTHING;