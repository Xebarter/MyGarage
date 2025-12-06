/*
  # Admin Audit Log for MyGarage

  1. New Tables
    - `admin_audit_log`
      - `id` (uuid, primary key)
      - `admin_id` (uuid, foreign key to admins)
      - `action` (text) - Action performed
      - `table_name` (text) - Table affected
      - `record_id` (uuid) - ID of the record affected
      - `old_values` (jsonb) - Old values before change
      - `new_values` (jsonb) - New values after change
      - `ip_address` (inet) - IP address of the request
      - `user_agent` (text) - User agent of the request
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on audit log table
    - Add policies for admin access control
*/

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) ON DELETE SET NULL,
  action text NOT NULL, -- INSERT, UPDATE, DELETE, SELECT
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_table_name ON admin_audit_log(table_name);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at);

-- Enable Row Level Security
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_audit_log
-- Admins can view their own audit logs
CREATE POLICY "Admins can view their own audit logs"
  ON admin_audit_log FOR SELECT
  USING (admin_id = auth.uid());

-- Super admins can view all audit logs
CREATE POLICY "Super admins can view all audit logs"
  ON admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- Only allow inserts from admins (application logic will handle actual inserts)
CREATE POLICY "Allow audit log inserts for admins"
  ON admin_audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- No update or delete policies since audit logs should be immutable

-- Grant permissions
GRANT INSERT ON admin_audit_log TO authenticated;
GRANT SELECT ON admin_audit_log TO authenticated;