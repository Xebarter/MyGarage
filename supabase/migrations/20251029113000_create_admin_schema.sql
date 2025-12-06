/*
  # Admin Schema for MyGarage

  1. New Tables
    - `admins`
      - `id` (uuid, primary key, foreign key to auth.users)
      - `email` (text) - Admin's email
      - `full_name` (text) - Admin's full name
      - `role` (text) - Role of admin (admin, super_admin)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `admin_permissions`
      - `id` (uuid, primary key)
      - `admin_id` (uuid, foreign key to admins)
      - `permission` (text) - Specific permissions
      - `granted_at` (timestamptz)

  2. Security
    - Enable RLS on all admin tables
    - Add policies for admin access control
*/

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_admin_id ON admin_permissions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_permission ON admin_permissions(permission);

-- Enable Row Level Security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admins
-- Admins can view their own record
DROP POLICY IF EXISTS "Admins can view their own record" ON admins;
CREATE POLICY "Admins can view their own record"
  ON admins FOR SELECT
  USING (id = auth.uid());

-- Admins can view all records if they are super_admin
DROP POLICY IF EXISTS "Super admins can view all admin records" ON admins;
CREATE POLICY "Super admins can view all admin records"
  ON admins FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    )
  );

-- Allow inserts for admins (will be controlled by application logic)
DROP POLICY IF EXISTS "Allow admin inserts" ON admins;
CREATE POLICY "Allow admin inserts"
  ON admins FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    )
  );

-- Allow updates for admins (will be controlled by application logic)
DROP POLICY IF EXISTS "Allow admin updates" ON admins;
CREATE POLICY "Allow admin updates"
  ON admins FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    ) OR id = auth.uid()
  );

-- RLS Policies for admin_permissions
-- Admins can view their own permissions
DROP POLICY IF EXISTS "Admins can view their own permissions" ON admin_permissions;
CREATE POLICY "Admins can view their own permissions"
  ON admin_permissions FOR SELECT
  USING (
    admin_id = auth.uid()
  );

-- Admins can view all permissions if they are super_admin
DROP POLICY IF EXISTS "Super admins can view all permissions" ON admin_permissions;
CREATE POLICY "Super admins can view all permissions"
  ON admin_permissions FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    )
  );

-- Allow inserts for permissions (only super admins)
DROP POLICY IF EXISTS "Only super admins can insert permissions" ON admin_permissions;
CREATE POLICY "Only super admins can insert permissions"
  ON admin_permissions FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    )
  );

-- Allow updates for permissions (only super admins)
DROP POLICY IF EXISTS "Only super admins can update permissions" ON admin_permissions;
CREATE POLICY "Only super admins can update permissions"
  ON admin_permissions FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    )
  );

-- Allow deletes for permissions (only super admins)
DROP POLICY IF EXISTS "Only super admins can delete permissions" ON admin_permissions;
CREATE POLICY "Only super admins can delete permissions"
  ON admin_permissions FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM admins WHERE role = 'super_admin'
    )
  );

-- Grant permissions to roles
GRANT ALL ON admins TO authenticated;
GRANT ALL ON admin_permissions TO authenticated;

-- Insert default super admin (this would typically be done via application logic)
-- INSERT INTO admins (id, email, full_name, role)
-- VALUES (auth.uid(), 'super@admin.com', 'Super Admin', 'super_admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'super_admin';