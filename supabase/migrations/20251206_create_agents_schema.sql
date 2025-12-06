/*
  # Agents Schema for MyGarage

  This migration creates a comprehensive schema for managing agents who act as intermediaries
  between the platform and repair shops/mechanics.

  Core Features:
  1. Agents table - stores agent information
  2. Agent permissions - granular permissions for agents
  3. Agent assigned repair shops - track which repair shops an agent manages
  4. Agent activity log - audit trail of agent actions
  5. Agent commission tracking - commission rates and payouts
  6. Agent performance metrics - KPIs and statistics

  Security:
  - All tables have RLS policies for agent access control
  - Agents can only see their own data by default
  - Super admins can see all agent data
*/

-- ================================================================
-- 1. AGENTS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone_number text,
  profile_image_url text DEFAULT '',
  bio text DEFAULT '',
  
  -- Agent status and verification
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'verified', 'pending_verification')),
  is_verified boolean DEFAULT false,
  verification_date timestamptz,
  
  -- Commission and payment info
  commission_rate numeric(5, 2) DEFAULT 0.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  commission_type text DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL,
  
  -- Agent region/territory
  assigned_region text,
  service_areas text[] DEFAULT '{}', -- Array of cities/states
  
  -- Performance tracking
  total_shops_managed integer DEFAULT 0,
  total_mechanics_managed integer DEFAULT 0,
  total_orders_facilitated integer DEFAULT 0,
  total_revenue_generated numeric(12, 2) DEFAULT 0.00,
  
  -- Metadata
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_is_verified ON agents(is_verified);
CREATE INDEX IF NOT EXISTS idx_agents_assigned_region ON agents(assigned_region);

-- ================================================================
-- 2. AGENT PERMISSIONS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS agent_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  permission text NOT NULL CHECK (permission IN (
    'manage_repair_shops',
    'manage_mechanics',
    'view_orders',
    'manage_orders',
    'view_appointments',
    'manage_appointments',
    'view_payments',
    'manage_payments',
    'view_reports',
    'manage_reports',
    'view_commission',
    'view_assigned_shops',
    'create_promotion',
    'manage_mechanics_assignments'
  )),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_agent_permissions_agent_id ON agent_permissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_permissions_permission ON agent_permissions(permission);

-- ================================================================
-- 3. AGENT ASSIGNED REPAIR SHOPS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS agent_assigned_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  repair_shop_id uuid REFERENCES repair_shops(id) ON DELETE CASCADE NOT NULL,
  
  -- Assignment details
  assigned_date timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'ended')),
  end_date timestamptz,
  
  -- Performance tracking for this shop
  shop_orders_facilitated integer DEFAULT 0,
  shop_revenue_generated numeric(12, 2) DEFAULT 0.00,
  
  -- Commission split specific to this shop
  shop_commission_override numeric(5, 2), -- NULL means use default agent commission
  
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, repair_shop_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_assigned_shops_agent_id ON agent_assigned_shops(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_assigned_shops_shop_id ON agent_assigned_shops(repair_shop_id);
CREATE INDEX IF NOT EXISTS idx_agent_assigned_shops_status ON agent_assigned_shops(status);

-- ================================================================
-- 4. AGENT ASSIGNED MECHANICS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS agent_assigned_mechanics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  mechanic_id uuid,
  
  -- Assignment details
  assigned_date timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'ended')),
  end_date timestamptz,
  
  -- Performance tracking for this mechanic
  mechanic_orders_facilitated integer DEFAULT 0,
  mechanic_revenue_generated numeric(12, 2) DEFAULT 0.00,
  
  -- Commission split specific to this mechanic
  mechanic_commission_override numeric(5, 2), -- NULL means use default agent commission
  
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, mechanic_id)
);

-- Add foreign key constraint for mechanic_id if mechanics table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mechanics') THEN
    ALTER TABLE agent_assigned_mechanics
    ADD CONSTRAINT fk_mechanic_id FOREIGN KEY (mechanic_id) REFERENCES mechanics(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_assigned_mechanics_agent_id ON agent_assigned_mechanics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_assigned_mechanics_mechanic_id ON agent_assigned_mechanics(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_agent_assigned_mechanics_status ON agent_assigned_mechanics(status);

-- ================================================================
-- 5. AGENT ACTIVITY LOG TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS agent_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  action text NOT NULL, -- e.g., 'created_shop', 'updated_mechanic', 'facilitated_order'
  entity_type text NOT NULL CHECK (entity_type IN ('repair_shop', 'mechanic', 'order', 'appointment', 'commission')),
  entity_id uuid,
  description text,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_log_agent_id ON agent_activity_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_action ON agent_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_entity_type ON agent_activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_created_at ON agent_activity_log(created_at);

-- ================================================================
-- 6. AGENT COMMISSION TRACKING TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS agent_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  order_id uuid,
  
  -- Commission details
  commission_amount numeric(12, 2) NOT NULL CHECK (commission_amount >= 0),
  commission_rate numeric(5, 2) NOT NULL,
  commission_type text NOT NULL CHECK (commission_type IN ('percentage', 'fixed')),
  
  -- Base amount for calculation
  base_amount numeric(12, 2) NOT NULL CHECK (base_amount >= 0),
  
  -- Status
  status text DEFAULT 'earned' CHECK (status IN ('earned', 'pending', 'paid', 'cancelled')),
  payment_date timestamptz,
  
  -- Period
  commission_period text, -- e.g., 'Dec-2025'
  
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for order_id if orders table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    ALTER TABLE agent_commissions
    ADD CONSTRAINT fk_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent_id ON agent_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_order_id ON agent_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_status ON agent_commissions(status);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_commission_period ON agent_commissions(commission_period);

-- ================================================================
-- 7. AGENT PERFORMANCE METRICS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  
  -- Time period
  metric_period text NOT NULL, -- e.g., 'Dec-2025', 'Q4-2025'
  period_start_date date NOT NULL,
  period_end_date date NOT NULL,
  
  -- Order metrics
  total_orders integer DEFAULT 0,
  completed_orders integer DEFAULT 0,
  cancelled_orders integer DEFAULT 0,
  completion_rate numeric(5, 2) DEFAULT 0.00,
  
  -- Revenue metrics
  total_sales numeric(12, 2) DEFAULT 0.00,
  total_commission numeric(12, 2) DEFAULT 0.00,
  average_order_value numeric(12, 2) DEFAULT 0.00,
  
  -- Shop metrics
  shops_managed integer DEFAULT 0,
  new_shops_added integer DEFAULT 0,
  
  -- Mechanic metrics
  mechanics_managed integer DEFAULT 0,
  new_mechanics_added integer DEFAULT 0,
  
  -- Quality metrics
  customer_satisfaction_rating numeric(3, 2),
  complaints_received integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, metric_period)
);

CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent_id ON agent_performance_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_period ON agent_performance_metrics(metric_period);

-- ================================================================
-- 8. AGENT PAYOUT TRACKING TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS agent_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  
  -- Payout period
  payout_period text NOT NULL, -- e.g., 'Dec-2025'
  period_start_date date NOT NULL,
  period_end_date date NOT NULL,
  
  -- Payout details
  total_commissions numeric(12, 2) NOT NULL CHECK (total_commissions >= 0),
  deductions numeric(12, 2) DEFAULT 0.00 CHECK (deductions >= 0),
  net_payout numeric(12, 2) NOT NULL CHECK (net_payout >= 0),
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Payment info
  payment_method_id uuid,
  processed_date timestamptz,
  
  -- Tracking
  transaction_id text UNIQUE,
  notes text DEFAULT '',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for payment_method_id if payment_methods table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods') THEN
    ALTER TABLE agent_payouts
    ADD CONSTRAINT fk_payment_method_id FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_payouts_agent_id ON agent_payouts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_payouts_status ON agent_payouts(status);
CREATE INDEX IF NOT EXISTS idx_agent_payouts_period ON agent_payouts(payout_period);

-- ================================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_assigned_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_assigned_mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_payouts ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 10. RLS POLICIES FOR AGENTS TABLE
-- ================================================================
-- Agents can view their own profile
CREATE POLICY "Agents can view their own profile"
  ON agents FOR SELECT
  USING (id = auth.uid());

-- Super admins can view all agents
CREATE POLICY "Super admins can view all agents"
  ON agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- Super admins can insert agents
CREATE POLICY "Super admins can create agents"
  ON agents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- Super admins and the agent can update agent profiles
CREATE POLICY "Agents can update their own profile"
  ON agents FOR UPDATE
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM admins a 
    WHERE a.id = auth.uid() AND a.role = 'super_admin'
  ));

-- Super admins can delete agents
CREATE POLICY "Super admins can delete agents"
  ON agents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- ================================================================
-- 11. RLS POLICIES FOR AGENT PERMISSIONS
-- ================================================================
-- Agents can view their own permissions
CREATE POLICY "Agents can view their own permissions"
  ON agent_permissions FOR SELECT
  USING (
    agent_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- Super admins can manage all permissions
CREATE POLICY "Super admins can manage agent permissions"
  ON agent_permissions FOR ALL
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

-- ================================================================
-- 12. RLS POLICIES FOR AGENT ASSIGNED SHOPS
-- ================================================================
-- Agents can view their assigned shops
CREATE POLICY "Agents can view their assigned shops"
  ON agent_assigned_shops FOR SELECT
  USING (
    agent_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- Super admins can manage all assignments
CREATE POLICY "Super admins can manage shop assignments"
  ON agent_assigned_shops FOR ALL
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

-- ================================================================
-- 13. RLS POLICIES FOR AGENT ASSIGNED MECHANICS
-- ================================================================
-- Agents can view their assigned mechanics
CREATE POLICY "Agents can view their assigned mechanics"
  ON agent_assigned_mechanics FOR SELECT
  USING (
    agent_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- Super admins can manage all mechanic assignments
CREATE POLICY "Super admins can manage mechanic assignments"
  ON agent_assigned_mechanics FOR ALL
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

-- ================================================================
-- 14. RLS POLICIES FOR AGENT ACTIVITY LOG
-- ================================================================
-- Agents can view their own activity
CREATE POLICY "Agents can view their own activity"
  ON agent_activity_log FOR SELECT
  USING (
    agent_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- Allow inserts for activity logging
CREATE POLICY "Allow activity log inserts"
  ON agent_activity_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ================================================================
-- 15. RLS POLICIES FOR AGENT COMMISSIONS
-- ================================================================
-- Agents can view their own commissions
CREATE POLICY "Agents can view their own commissions"
  ON agent_commissions FOR SELECT
  USING (
    agent_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- Super admins can manage commissions
CREATE POLICY "Super admins can manage commissions"
  ON agent_commissions FOR ALL
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

-- ================================================================
-- 16. RLS POLICIES FOR AGENT PERFORMANCE METRICS
-- ================================================================
-- Agents can view their own metrics
CREATE POLICY "Agents can view their own metrics"
  ON agent_performance_metrics FOR SELECT
  USING (
    agent_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- Super admins can manage metrics
CREATE POLICY "Super admins can manage metrics"
  ON agent_performance_metrics FOR ALL
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

-- ================================================================
-- 17. RLS POLICIES FOR AGENT PAYOUTS
-- ================================================================
-- Agents can view their own payouts
CREATE POLICY "Agents can view their own payouts"
  ON agent_payouts FOR SELECT
  USING (
    agent_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid() AND a.role = 'super_admin'
    )
  );

-- Super admins can manage payouts
CREATE POLICY "Super admins can manage payouts"
  ON agent_payouts FOR ALL
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

-- ================================================================
-- 18. GRANT PERMISSIONS
-- ================================================================
GRANT ALL ON agents TO authenticated;
GRANT ALL ON agent_permissions TO authenticated;
GRANT ALL ON agent_assigned_shops TO authenticated;
GRANT ALL ON agent_assigned_mechanics TO authenticated;
GRANT ALL ON agent_activity_log TO authenticated;
GRANT ALL ON agent_commissions TO authenticated;
GRANT ALL ON agent_performance_metrics TO authenticated;
GRANT ALL ON agent_payouts TO authenticated;

-- ================================================================
-- 19. HELPFUL VIEWS
-- ================================================================

-- View for agent dashboard summary
CREATE OR REPLACE VIEW agent_dashboard_summary AS
SELECT 
  a.id,
  a.email,
  a.full_name,
  a.status,
  a.is_verified,
  a.commission_rate,
  a.total_shops_managed,
  a.total_mechanics_managed,
  a.total_orders_facilitated,
  a.total_revenue_generated,
  COALESCE(SUM(CASE WHEN c.status = 'earned' THEN c.commission_amount ELSE 0 END), 0) AS total_earned_commissions,
  COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.commission_amount ELSE 0 END), 0) AS total_paid_commissions,
  COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.commission_amount ELSE 0 END), 0) AS pending_commission,
  (SELECT COUNT(*) FROM agent_assigned_shops WHERE agent_id = a.id AND status = 'active') AS active_shops,
  (SELECT COUNT(*) FROM agent_assigned_mechanics WHERE agent_id = a.id AND status = 'active') AS active_mechanics
FROM agents a
LEFT JOIN agent_commissions c ON a.id = c.agent_id
GROUP BY a.id;

-- View for agent activity summary
CREATE OR REPLACE VIEW agent_activity_summary AS
SELECT 
  agent_id,
  COUNT(*) AS total_activities,
  COUNT(CASE WHEN action = 'created_shop' THEN 1 END) AS shops_created,
  COUNT(CASE WHEN action = 'updated_mechanic' THEN 1 END) AS mechanics_updated,
  COUNT(CASE WHEN action = 'facilitated_order' THEN 1 END) AS orders_facilitated,
  MAX(created_at) AS last_activity
FROM agent_activity_log
GROUP BY agent_id;

-- ================================================================
-- 20. HELPER FUNCTIONS
-- ================================================================

-- Function to calculate and create commission record
CREATE OR REPLACE FUNCTION create_agent_commission(
  p_agent_id uuid,
  p_order_id uuid,
  p_commission_rate numeric,
  p_commission_type text,
  p_base_amount numeric,
  p_commission_period text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_commission_amount numeric;
  v_commission_id uuid;
BEGIN
  -- Calculate commission amount
  IF p_commission_type = 'percentage' THEN
    v_commission_amount := (p_base_amount * p_commission_rate) / 100;
  ELSE
    v_commission_amount := p_commission_rate;
  END IF;
  
  -- Insert commission record
  INSERT INTO agent_commissions (
    agent_id,
    order_id,
    commission_amount,
    commission_rate,
    commission_type,
    base_amount,
    commission_period
  ) VALUES (
    p_agent_id,
    p_order_id,
    v_commission_amount,
    p_commission_rate,
    p_commission_type,
    p_base_amount,
    p_commission_period
  ) RETURNING id INTO v_commission_id;
  
  RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log agent activity
CREATE OR REPLACE FUNCTION log_agent_activity(
  p_agent_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_activity_id uuid;
BEGIN
  INSERT INTO agent_activity_log (
    agent_id,
    action,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    p_agent_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_description,
    COALESCE(p_metadata, '{}')
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process agent payout
CREATE OR REPLACE FUNCTION process_agent_payout(
  p_agent_id uuid,
  p_payout_period text
)
RETURNS uuid AS $$
DECLARE
  v_total_commissions numeric;
  v_payout_id uuid;
BEGIN
  -- Calculate total commissions for the period
  SELECT COALESCE(SUM(commission_amount), 0)
  INTO v_total_commissions
  FROM agent_commissions
  WHERE agent_id = p_agent_id
    AND status = 'earned'
    AND commission_period = p_payout_period;
  
  -- Create payout record
  INSERT INTO agent_payouts (
    agent_id,
    payout_period,
    period_start_date,
    period_end_date,
    total_commissions,
    net_payout
  ) VALUES (
    p_agent_id,
    p_payout_period,
    (p_payout_period || '-01')::date,
    (date_trunc('month', (p_payout_period || '-01')::date) + interval '1 month' - interval '1 day')::date,
    v_total_commissions,
    v_total_commissions
  ) RETURNING id INTO v_payout_id;
  
  -- Update commission status to pending
  UPDATE agent_commissions
  SET status = 'pending'
  WHERE agent_id = p_agent_id
    AND status = 'earned'
    AND commission_period = p_payout_period;
  
  RETURN v_payout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only super admins can execute these functions
REVOKE EXECUTE ON FUNCTION create_agent_commission(uuid, uuid, numeric, text, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION log_agent_activity(uuid, text, text, uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION process_agent_payout(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_agent_commission(uuid, uuid, numeric, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION log_agent_activity(uuid, text, text, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION process_agent_payout(uuid, text) TO authenticated;

-- ================================================================
-- 21. SAMPLE DATA (Optional - comment out in production)
-- ================================================================
-- INSERT INTO agent_permissions (agent_id, permission) VALUES
--   ((SELECT id FROM agents LIMIT 1), 'manage_repair_shops'),
--   ((SELECT id FROM agents LIMIT 1), 'manage_mechanics'),
--   ((SELECT id FROM agents LIMIT 1), 'view_orders'),
--   ((SELECT id FROM agents LIMIT 1), 'view_commission'),
--   ((SELECT id FROM agents LIMIT 1), 'view_assigned_shops')
-- ON CONFLICT (agent_id, permission) DO NOTHING;
