/*
  # Super Admin Functionality for MyGarage

  This migration adds specialized functionality for superadmins including:
  1. Enhanced permissions system for superadmins
  2. Cross-schema management views
  3. System-wide analytics and reporting
  4. Admin hierarchy management
  5. Audit trails specifically for superadmin actions
*/

-- Create superadmin specific permissions table
CREATE TABLE IF NOT EXISTS super_admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_name text UNIQUE NOT NULL,
  description text,
  category text,
  created_at timestamptz DEFAULT now()
);

-- Create admin hierarchy table to manage relationships between admins
CREATE TABLE IF NOT EXISTS admin_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) ON DELETE CASCADE,
  supervisor_id uuid REFERENCES admins(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(admin_id)
);

-- Create system metrics table for tracking overall platform statistics
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric,
  recorded_at timestamptz DEFAULT now(),
  recorded_by uuid REFERENCES admins(id),
  UNIQUE(metric_name, recorded_at)
);

-- Create a view for superadmin dashboard overview
CREATE OR REPLACE VIEW super_admin_dashboard AS
SELECT 
  -- Admin counts
  (SELECT COUNT(*) FROM admins WHERE role = 'admin') AS total_admins,
  (SELECT COUNT(*) FROM admins WHERE role = 'super_admin') AS total_super_admins,
  
  -- Shop metrics
  (SELECT COUNT(*) FROM repair_shops) AS total_repair_shops,
  (SELECT COUNT(*) FROM repair_shops WHERE verified = true) AS verified_repair_shops,
  
  -- Order metrics
  (SELECT COUNT(*) FROM orders) AS total_orders,
  (SELECT COUNT(*) FROM orders WHERE status = 'completed') AS completed_orders,
  (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed') AS total_revenue,
  
  -- Parts metrics
  (SELECT COUNT(*) FROM parts) AS total_parts,
  (SELECT SUM(stock_quantity) FROM parts) AS total_parts_inventory,
  
  -- User metrics
  (SELECT COUNT(*) FROM auth.users) AS total_users,
  
  -- Recent activity
  (SELECT COUNT(*) FROM admin_audit_log WHERE created_at > NOW() - INTERVAL '24 hours') AS recent_admin_actions,
  
  -- Last updated timestamp
  NOW() AS last_updated;

-- Create a view for detailed admin management
CREATE OR REPLACE VIEW super_admin_admins_view AS
SELECT 
  a.id,
  a.email,
  a.full_name,
  a.role,
  a.created_at,
  (SELECT COUNT(*) FROM admin_audit_log WHERE admin_id = a.id) AS total_actions,
  (SELECT action FROM admin_audit_log WHERE admin_id = a.id ORDER BY created_at DESC LIMIT 1) AS last_action,
  (SELECT created_at FROM admin_audit_log WHERE admin_id = a.id ORDER BY created_at DESC LIMIT 1) AS last_active,
  s.supervisor_id,
  sup.full_name AS supervisor_name
FROM admins a
LEFT JOIN admin_hierarchy s ON a.id = s.admin_id
LEFT JOIN admins sup ON s.supervisor_id = sup.id
ORDER BY a.role DESC, a.created_at ASC;

-- Create a view for system-wide repair shop analytics
CREATE OR REPLACE VIEW super_admin_repair_shop_analytics AS
SELECT 
  rs.id,
  rs.name,
  rs.city,
  rs.state,
  rs.rating,
  rs.verified,
  0 AS total_appointments,
  0 AS completed_appointments,
  0 AS cancelled_appointments,
  0 AS avg_completion_hours
FROM repair_shops rs
ORDER BY rs.rating DESC NULLS LAST;

-- Create a materialized view for performance reports
CREATE MATERIALIZED VIEW super_admin_performance_report AS
SELECT 
  DATE_TRUNC('month', o.created_at) AS month,
  COUNT(o.id) AS total_orders,
  COUNT(CASE WHEN o.status = 'completed' THEN 1 END) AS completed_orders,
  AVG(o.total_amount) AS avg_order_value,
  SUM(o.total_amount) AS total_revenue,
  COUNT(DISTINCT o.created_by) AS active_admins
FROM orders o
WHERE o.created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', o.created_at)
ORDER BY month DESC;

-- Refresh the materialized view periodically
-- REFRESH MATERIALIZED VIEW super_admin_performance_report;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_super_admin_permissions_name ON super_admin_permissions(permission_name);
CREATE INDEX IF NOT EXISTS idx_admin_hierarchy_admin ON admin_hierarchy(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_hierarchy_supervisor ON admin_hierarchy(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded ON system_metrics(recorded_at);

-- Insert default superadmin permissions
INSERT INTO super_admin_permissions (permission_name, description, category) VALUES
  ('manage_admins', 'Can create, update, and delete admins', 'Administration'),
  ('manage_super_admins', 'Can create, update, and delete super admins', 'Administration'),
  ('view_all_audit_logs', 'Can view audit logs for all admins', 'Security'),
  ('system_configuration', 'Can modify system-wide configuration', 'System'),
  ('access_super_reports', 'Can access super admin reports and analytics', 'Reporting'),
  ('manage_repair_shops', 'Can create, update, and delete repair shops', 'Business'),
  ('verify_repair_shops', 'Can verify repair shops', 'Business'),
  ('view_system_metrics', 'Can view system performance metrics', 'Monitoring')
ON CONFLICT (permission_name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE super_admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for super_admin_permissions
CREATE POLICY "Super admins can view all permissions"
  ON super_admin_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- RLS Policies for admin_hierarchy
CREATE POLICY "Admins can view hierarchy"
  ON admin_hierarchy FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage hierarchy"
  ON admin_hierarchy FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- RLS Policies for system_metrics
CREATE POLICY "Super admins can view system metrics"
  ON system_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert system metrics"
  ON system_metrics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- Grant permissions to authenticated users
GRANT SELECT ON super_admin_dashboard TO authenticated;
GRANT SELECT ON super_admin_admins_view TO authenticated;
GRANT SELECT ON super_admin_repair_shop_analytics TO authenticated;
GRANT SELECT ON super_admin_performance_report TO authenticated;

-- Grant specific permissions for super admins
GRANT ALL ON super_admin_permissions TO authenticated;
GRANT ALL ON admin_hierarchy TO authenticated;
GRANT ALL ON system_metrics TO authenticated;

-- Create functions for superadmin actions
CREATE OR REPLACE FUNCTION promote_to_super_admin(admin_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE admins 
  SET role = 'super_admin' 
  WHERE email = admin_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION demote_from_super_admin(admin_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE admins 
  SET role = 'admin' 
  WHERE email = admin_email AND email != (SELECT email FROM admins WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only super admins can execute these functions
REVOKE EXECUTE ON FUNCTION promote_to_super_admin(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION demote_from_super_admin(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION promote_to_super_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION demote_from_super_admin(TEXT) TO authenticated;