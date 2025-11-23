/*
  # Create Service-Parts Link Table

  1. New Tables
    - `service_parts`
      - `id` (uuid, primary key)
      - `service_id` (uuid) - Foreign key to services
      - `part_id` (uuid) - Foreign key to parts
      - `quantity` (integer) - Quantity of parts needed
      - `notes` (text) - Additional notes about part usage
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on service_parts table
    - Add policies for read/write access
*/

-- Create service_parts table
CREATE TABLE IF NOT EXISTS service_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_parts_service_id ON service_parts(service_id);
CREATE INDEX IF NOT EXISTS idx_service_parts_part_id ON service_parts(part_id);

-- Enable Row Level Security
ALTER TABLE service_parts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_parts
CREATE POLICY "Repair shops can manage their service parts"
  ON service_parts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM services 
      WHERE services.id = service_parts.service_id 
      AND services.repair_shop_id IN (
        SELECT id FROM repair_shops
      )
    )
  );

CREATE POLICY "Anyone can view service parts"
  ON service_parts FOR SELECT
  USING (true);