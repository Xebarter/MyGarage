/*
  # Enhance Existing Tables with Admin Access Control

  1. Add ownership fields to existing tables
    - Add `created_by` and `updated_by` fields to track who made changes
    - Add proper RLS policies for admin access
*/

-- Add ownership columns to parts table
ALTER TABLE parts 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Add ownership columns to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Add ownership columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Add ownership columns to repair_shops table
ALTER TABLE repair_shops
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Add ownership columns to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parts_created_by ON parts(created_by);
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_repair_shops_created_by ON repair_shops(created_by);
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON appointments(created_by);

-- Update existing RLS policies for parts table
DROP POLICY IF EXISTS "Anyone can view parts" ON parts;
CREATE POLICY "Anyone can view parts"
  ON parts FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage parts"
  ON parts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid()
    )
  );

-- Update existing RLS policies for categories table
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid()
    )
  );

-- Update existing RLS policies for orders table
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;

CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage orders"
  ON orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid()
    )
  );

-- Update existing RLS policies for repair_shops table
DROP POLICY IF EXISTS "Anyone can view repair shops" ON repair_shops;

CREATE POLICY "Anyone can view repair shops"
  ON repair_shops FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage repair shops"
  ON repair_shops FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid()
    )
  );

-- Update existing RLS policies for appointments table
DROP POLICY IF EXISTS "Anyone can create appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated can view appointments" ON appointments;

CREATE POLICY "Anyone can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their appointments"
  ON appointments FOR SELECT
  USING (customer_email = auth.jwt() ->> 'email' OR auth.role() = 'authenticated');

CREATE POLICY "Admins can manage appointments"
  ON appointments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid()
    )
  );

-- Create functions to automatically set ownership
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic ownership setting
DROP TRIGGER IF EXISTS set_parts_owner ON parts;
CREATE TRIGGER set_parts_owner
  BEFORE INSERT OR UPDATE ON parts
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS set_categories_owner ON categories;
CREATE TRIGGER set_categories_owner
  BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS set_orders_owner ON orders;
CREATE TRIGGER set_orders_owner
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS set_repair_shops_owner ON repair_shops;
CREATE TRIGGER set_repair_shops_owner
  BEFORE INSERT OR UPDATE ON repair_shops
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS set_appointments_owner ON appointments;
CREATE TRIGGER set_appointments_owner
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();