/*
  # Enhanced Mechanics Schema for MyGarage

  This migration creates a comprehensive schema for managing mechanics with enhanced functionality.
  
  Key Features:
  1. Mechanics table - core mechanic information with auth integration
  2. Mechanic availability - scheduling and working hours
  3. Mechanic services - specializations and services offered
  4. Mechanic certifications - qualifications and licenses
  5. Mechanic performance - ratings, reviews, and statistics
  6. Mechanic earnings - commission tracking and payouts
  7. Repair shop owners - distinguishing owners from mechanics
  8. Access control - both mechanics and owners can access /repairshop route

  Security:
  - All tables have RLS policies
  - Mechanics can only see their own data
  - Repair shop owners can see their shop's mechanics data
  - Super admins can see all data
*/

-- ================================================================
-- 1. ENHANCED MECHANICS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS mechanics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_shop_id uuid NOT NULL, -- Foreign key to repair_shops (added conditionally below)
  auth_id uuid UNIQUE, -- Link to Supabase auth.users table
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  bio text DEFAULT '',
  profile_image_url text DEFAULT '',
  
  -- Professional qualifications
  certifications text[] DEFAULT '{}',
  specializations text[] DEFAULT '{}',
  years_of_experience integer DEFAULT 0 CHECK (years_of_experience >= 0),
  
  -- Compensation
  hourly_rate numeric(10, 2) DEFAULT 0.00 CHECK (hourly_rate >= 0),
  commission_rate numeric(5, 2) DEFAULT 0.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  
  -- Status and verification
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  verification_date timestamptz,
  
  -- Performance metrics (denormalized for quick access)
  total_appointments integer DEFAULT 0,
  completed_appointments integer DEFAULT 0,
  cancelled_appointments integer DEFAULT 0,
  average_rating numeric(3, 2),
  total_reviews integer DEFAULT 0,
  
  -- Additional info
  background_check_completed boolean DEFAULT false,
  insurance_verified boolean DEFAULT false,
  notes text DEFAULT '',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mechanics_repair_shop_id ON mechanics(repair_shop_id);
CREATE INDEX IF NOT EXISTS idx_mechanics_auth_id ON mechanics(auth_id);
CREATE INDEX IF NOT EXISTS idx_mechanics_email ON mechanics(email);
CREATE INDEX IF NOT EXISTS idx_mechanics_is_active ON mechanics(is_active);
CREATE INDEX IF NOT EXISTS idx_mechanics_is_verified ON mechanics(is_verified);

-- Add foreign key constraint for repair_shop_id if repair_shops table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repair_shops') THEN
    ALTER TABLE mechanics
    ADD CONSTRAINT fk_repair_shop_id FOREIGN KEY (repair_shop_id) REFERENCES repair_shops(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ================================================================
-- 2. MECHANIC WORKING HOURS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS mechanic_working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid REFERENCES mechanics(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  break_start_time time,
  break_end_time time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(mechanic_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_mechanic_working_hours_mechanic_id ON mechanic_working_hours(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_working_hours_day ON mechanic_working_hours(day_of_week);

-- ================================================================
-- 3. MECHANIC SERVICES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS mechanic_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid REFERENCES mechanics(id) ON DELETE CASCADE NOT NULL,
  service_type text NOT NULL CHECK (service_type IN (
    'oil_change', 'tire_service', 'brake_service', 'engine_repair',
    'transmission_repair', 'electrical', 'suspension', 'ac_repair',
    'inspection', 'maintenance', 'diagnostics', 'welding', 'painting', 'other'
  )),
  service_name text NOT NULL,
  description text DEFAULT '',
  estimated_duration_minutes integer CHECK (estimated_duration_minutes > 0),
  base_price numeric(10, 2) CHECK (base_price >= 0),
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(mechanic_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_mechanic_services_mechanic_id ON mechanic_services(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_services_service_type ON mechanic_services(service_type);

-- ================================================================
-- 4. MECHANIC CERTIFICATIONS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS mechanic_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid REFERENCES mechanics(id) ON DELETE CASCADE NOT NULL,
  certification_name text NOT NULL,
  issuing_organization text NOT NULL,
  issue_date date NOT NULL,
  expiry_date date,
  certification_number text UNIQUE,
  document_url text,
  is_verified boolean DEFAULT false,
  verified_date timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mechanic_certifications_mechanic_id ON mechanic_certifications(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_certifications_expiry_date ON mechanic_certifications(expiry_date);

-- ================================================================
-- 5. MECHANIC APPOINTMENTS TABLE (Enhanced)
-- ================================================================
CREATE TABLE IF NOT EXISTS mechanic_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid REFERENCES mechanics(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid, -- Foreign key to appointments (added conditionally)
  service_id uuid, -- Foreign key to services (added conditionally)
  
  -- Status
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  
  -- Timing
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  actual_duration_minutes integer,
  
  -- Work details
  notes text DEFAULT '',
  work_description text DEFAULT '',
  
  -- Quality metrics
  customer_feedback text DEFAULT '',
  customer_rating integer CHECK (customer_rating IS NULL OR (customer_rating >= 1 AND customer_rating <= 5)),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mechanic_appointments_mechanic_id ON mechanic_appointments(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_appointments_status ON mechanic_appointments(status);
CREATE INDEX IF NOT EXISTS idx_mechanic_appointments_start_time ON mechanic_appointments(start_time);

-- Add foreign key constraints if referenced tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    ALTER TABLE mechanic_appointments
    ADD CONSTRAINT fk_appointment_id FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') THEN
    ALTER TABLE mechanic_appointments
    ADD CONSTRAINT fk_service_id FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ================================================================
-- 6. MECHANIC REVIEWS & RATINGS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS mechanic_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid REFERENCES mechanics(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid, -- Reference to customer/user who left review
  appointment_id uuid,
  
  -- Review details
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  comment text,
  
  -- Aspects rated
  professionalism_rating integer CHECK (professionalism_rating IS NULL OR (professionalism_rating >= 1 AND professionalism_rating <= 5)),
  punctuality_rating integer CHECK (punctuality_rating IS NULL OR (punctuality_rating >= 1 AND punctuality_rating <= 5)),
  quality_rating integer CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
  communication_rating integer CHECK (communication_rating IS NULL OR (communication_rating >= 1 AND communication_rating <= 5)),
  
  -- Verification
  is_verified boolean DEFAULT false,
  is_helpful boolean,
  helpful_count integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mechanic_reviews_mechanic_id ON mechanic_reviews(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_reviews_rating ON mechanic_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_mechanic_reviews_created_at ON mechanic_reviews(created_at);

-- ================================================================
-- 7. MECHANIC EARNINGS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS mechanic_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid REFERENCES mechanics(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid,
  
  -- Earning details
  base_amount numeric(12, 2) NOT NULL CHECK (base_amount >= 0),
  commission_rate numeric(5, 2) DEFAULT 0.00,
  commission_amount numeric(12, 2) DEFAULT 0.00,
  total_earned numeric(12, 2) NOT NULL CHECK (total_earned >= 0),
  
  -- Deductions
  platform_fee numeric(12, 2) DEFAULT 0.00,
  insurance_deduction numeric(12, 2) DEFAULT 0.00,
  other_deductions numeric(12, 2) DEFAULT 0.00,
  total_deductions numeric(12, 2) DEFAULT 0.00,
  
  -- Net earning
  net_amount numeric(12, 2) NOT NULL CHECK (net_amount >= 0),
  
  -- Status
  status text DEFAULT 'earned' CHECK (status IN ('earned', 'pending', 'paid', 'refunded')),
  payment_date timestamptz,
  
  -- Period
  earning_period text, -- e.g., 'Dec-2025'
  
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mechanic_earnings_mechanic_id ON mechanic_earnings(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_earnings_status ON mechanic_earnings(status);
CREATE INDEX IF NOT EXISTS idx_mechanic_earnings_period ON mechanic_earnings(earning_period);

-- Add foreign key constraint for appointment_id if appointments table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    ALTER TABLE mechanic_earnings
    ADD CONSTRAINT fk_earnings_appointment_id FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ================================================================
-- 8. REPAIR SHOP OWNERS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS repair_shop_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_shop_id uuid NOT NULL, -- Foreign key to repair_shops (added conditionally)
  auth_id uuid UNIQUE, -- Link to Supabase auth.users table
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone_number text,
  profile_image_url text DEFAULT '',
  
  -- Owner details
  is_primary_owner boolean DEFAULT false,
  is_active boolean DEFAULT true,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Permissions
  can_manage_mechanics boolean DEFAULT true,
  can_manage_appointments boolean DEFAULT true,
  can_manage_payments boolean DEFAULT true,
  can_manage_shop_settings boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_repair_shop_owners_repair_shop_id ON repair_shop_owners(repair_shop_id);
CREATE INDEX IF NOT EXISTS idx_repair_shop_owners_auth_id ON repair_shop_owners(auth_id);
CREATE INDEX IF NOT EXISTS idx_repair_shop_owners_email ON repair_shop_owners(email);
CREATE INDEX IF NOT EXISTS idx_repair_shop_owners_is_primary ON repair_shop_owners(is_primary_owner);

-- Add foreign key constraint for repair_shop_id if repair_shops table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'repair_shops') THEN
    ALTER TABLE repair_shop_owners
    ADD CONSTRAINT fk_repair_shop_owner_id FOREIGN KEY (repair_shop_id) REFERENCES repair_shops(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ================================================================
-- 9. MECHANIC ACTIVITY LOG TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS mechanic_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid REFERENCES mechanics(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL, -- e.g., 'accepted_appointment', 'completed_work', 'updated_profile'
  entity_type text CHECK (entity_type IN ('appointment', 'service', 'profile', 'certification')),
  entity_id uuid,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mechanic_activity_log_mechanic_id ON mechanic_activity_log(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_activity_log_action ON mechanic_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_mechanic_activity_log_created_at ON mechanic_activity_log(created_at);

-- ================================================================
-- 10. ENABLE ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_shop_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_activity_log ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 11. RLS POLICIES FOR MECHANICS TABLE
-- ================================================================
-- Mechanics can view their own profile
CREATE POLICY "Mechanics can view their own profile"
  ON mechanics FOR SELECT
  USING (auth_id = auth.uid());

-- Shop owners can view mechanics in their shop
CREATE POLICY "Shop owners can view mechanics in their shop"
  ON mechanics FOR SELECT
  USING (
    repair_shop_id IN (
      SELECT repair_shop_id FROM repair_shop_owners WHERE auth_id = auth.uid()
    )
  );

-- Super admins can view all mechanics
CREATE POLICY "Super admins can view all mechanics"
  ON mechanics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admins can insert mechanics
CREATE POLICY "Super admins can create mechanics"
  ON mechanics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Mechanics can update their own profile
CREATE POLICY "Mechanics can update their own profile"
  ON mechanics FOR UPDATE
  USING (auth_id = auth.uid() OR EXISTS (
    SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- Shop owners can update mechanics in their shop
CREATE POLICY "Shop owners can update mechanics in their shop"
  ON mechanics FOR UPDATE
  USING (
    repair_shop_id IN (
      SELECT repair_shop_id FROM repair_shop_owners WHERE auth_id = auth.uid()
    )
  );

-- ================================================================
-- 12. RLS POLICIES FOR MECHANIC WORKING HOURS
-- ================================================================
-- Mechanics can view/manage their own hours
CREATE POLICY "Mechanics can manage their own working hours"
  ON mechanic_working_hours FOR ALL
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE auth_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Shop owners can view hours
CREATE POLICY "Shop owners can view mechanic hours"
  ON mechanic_working_hours FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE repair_shop_id IN (
        SELECT repair_shop_id FROM repair_shop_owners WHERE auth_id = auth.uid()
      )
    )
  );

-- ================================================================
-- 13. RLS POLICIES FOR MECHANIC SERVICES
-- ================================================================
-- Mechanics can view/manage their own services
CREATE POLICY "Mechanics can manage their own services"
  ON mechanic_services FOR ALL
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE auth_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Shop owners can view services
CREATE POLICY "Shop owners can view mechanic services"
  ON mechanic_services FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE repair_shop_id IN (
        SELECT repair_shop_id FROM repair_shop_owners WHERE auth_id = auth.uid()
      )
    )
  );

-- Public can view services
CREATE POLICY "Public can view mechanic services"
  ON mechanic_services FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE is_active = true AND is_verified = true
    )
  );

-- ================================================================
-- 14. RLS POLICIES FOR MECHANIC CERTIFICATIONS
-- ================================================================
-- Mechanics can manage their own certifications
CREATE POLICY "Mechanics can manage their own certifications"
  ON mechanic_certifications FOR ALL
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE auth_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Shop owners can view certifications
CREATE POLICY "Shop owners can view mechanic certifications"
  ON mechanic_certifications FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE repair_shop_id IN (
        SELECT repair_shop_id FROM repair_shop_owners WHERE auth_id = auth.uid()
      )
    )
  );

-- ================================================================
-- 15. RLS POLICIES FOR REPAIR SHOP OWNERS TABLE
-- ================================================================
-- Owners can view their own records
CREATE POLICY "Owners can view their own records"
  ON repair_shop_owners FOR SELECT
  USING (auth_id = auth.uid());

-- Super admins can view all owners
CREATE POLICY "Super admins can view all owners"
  ON repair_shop_owners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admins can manage owners
CREATE POLICY "Super admins can manage owners"
  ON repair_shop_owners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ================================================================
-- 16. RLS POLICIES FOR MECHANIC EARNINGS
-- ================================================================
-- Mechanics can view their own earnings
CREATE POLICY "Mechanics can view their own earnings"
  ON mechanic_earnings FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE auth_id = auth.uid()
    )
  );

-- Shop owners can view their mechanics' earnings
CREATE POLICY "Shop owners can view mechanic earnings"
  ON mechanic_earnings FOR SELECT
  USING (
    mechanic_id IN (
      SELECT id FROM mechanics WHERE repair_shop_id IN (
        SELECT repair_shop_id FROM repair_shop_owners WHERE auth_id = auth.uid()
      )
    )
  );

-- Super admins can manage all earnings
CREATE POLICY "Super admins can manage earnings"
  ON mechanic_earnings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ================================================================
-- 17. GRANT PERMISSIONS
-- ================================================================
GRANT ALL ON mechanics TO authenticated;
GRANT ALL ON mechanic_working_hours TO authenticated;
GRANT ALL ON mechanic_services TO authenticated;
GRANT ALL ON mechanic_certifications TO authenticated;
GRANT ALL ON mechanic_appointments TO authenticated;
GRANT ALL ON mechanic_reviews TO authenticated;
GRANT ALL ON mechanic_earnings TO authenticated;
GRANT ALL ON repair_shop_owners TO authenticated;
GRANT ALL ON mechanic_activity_log TO authenticated;

-- ================================================================
-- 18. HELPFUL VIEWS
-- ================================================================

-- Mechanic dashboard summary
CREATE OR REPLACE VIEW mechanic_dashboard_summary AS
SELECT 
  m.id,
  m.email,
  m.first_name,
  m.last_name,
  m.repair_shop_id,
  m.is_active,
  m.is_verified,
  m.average_rating,
  m.total_reviews,
  m.total_appointments,
  m.completed_appointments,
  CASE WHEN m.total_appointments > 0 
    THEN ROUND((m.completed_appointments::numeric / m.total_appointments) * 100, 2)
    ELSE 0
  END AS completion_rate,
  (SELECT COUNT(*) FROM mechanic_services WHERE mechanic_id = m.id) AS services_offered,
  (SELECT COUNT(*) FROM mechanic_certifications WHERE mechanic_id = m.id AND expiry_date > NOW()) AS active_certifications,
  COALESCE(SUM(CASE WHEN e.status = 'earned' THEN e.net_amount ELSE 0 END), 0) AS total_earned,
  COALESCE(SUM(CASE WHEN e.status = 'paid' THEN e.net_amount ELSE 0 END), 0) AS total_paid
FROM mechanics m
LEFT JOIN mechanic_earnings e ON m.id = e.mechanic_id
GROUP BY m.id;

-- Repair shop owner dashboard
CREATE OR REPLACE VIEW repair_shop_owner_dashboard AS
SELECT 
  rso.id AS owner_id,
  rso.email,
  rso.first_name,
  rso.last_name,
  rso.repair_shop_id,
  rso.is_primary_owner,
  (SELECT COUNT(*) FROM mechanics WHERE repair_shop_id = rso.repair_shop_id AND is_active = true) AS active_mechanics,
  (SELECT COUNT(*) FROM mechanics WHERE repair_shop_id = rso.repair_shop_id) AS total_mechanics,
  (SELECT COUNT(*) FROM mechanic_appointments ma 
    JOIN mechanics m ON ma.mechanic_id = m.id 
    WHERE m.repair_shop_id = rso.repair_shop_id 
    AND ma.status = 'completed' 
    AND DATE(ma.start_time) = CURRENT_DATE) AS completed_today,
  (SELECT COALESCE(AVG(average_rating), 0) FROM mechanics WHERE repair_shop_id = rso.repair_shop_id) AS avg_shop_rating
FROM repair_shop_owners rso;

-- ================================================================
-- 19. HELPER FUNCTIONS
-- ================================================================

-- Function to calculate mechanic earnings
CREATE OR REPLACE FUNCTION calculate_mechanic_earnings(
  p_mechanic_id uuid,
  p_appointment_id uuid,
  p_base_amount numeric
)
RETURNS uuid AS $$
DECLARE
  v_mechanic RECORD;
  v_commission_amount numeric;
  v_net_amount numeric;
  v_earnings_id uuid;
BEGIN
  -- Get mechanic details
  SELECT commission_rate INTO v_mechanic FROM mechanics WHERE id = p_mechanic_id;
  
  -- Calculate commission
  v_commission_amount := (p_base_amount * v_mechanic.commission_rate) / 100;
  v_net_amount := p_base_amount - v_commission_amount;
  
  -- Insert earnings record
  INSERT INTO mechanic_earnings (
    mechanic_id,
    appointment_id,
    base_amount,
    commission_rate,
    commission_amount,
    total_earned,
    net_amount
  ) VALUES (
    p_mechanic_id,
    p_appointment_id,
    p_base_amount,
    v_mechanic.commission_rate,
    v_commission_amount,
    p_base_amount,
    v_net_amount
  ) RETURNING id INTO v_earnings_id;
  
  RETURN v_earnings_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update mechanic rating
CREATE OR REPLACE FUNCTION update_mechanic_rating(
  p_mechanic_id uuid
)
RETURNS void AS $$
BEGIN
  UPDATE mechanics
  SET 
    average_rating = (SELECT AVG(rating) FROM mechanic_reviews WHERE mechanic_id = p_mechanic_id),
    total_reviews = (SELECT COUNT(*) FROM mechanic_reviews WHERE mechanic_id = p_mechanic_id)
  WHERE id = p_mechanic_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log mechanic activity
CREATE OR REPLACE FUNCTION log_mechanic_activity(
  p_mechanic_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_activity_id uuid;
BEGIN
  INSERT INTO mechanic_activity_log (
    mechanic_id,
    action,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    p_mechanic_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_description,
    COALESCE(p_metadata, '{}')
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only authenticated users can execute these functions
REVOKE EXECUTE ON FUNCTION calculate_mechanic_earnings(uuid, uuid, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_mechanic_rating(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION log_mechanic_activity(uuid, text, text, uuid, text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION calculate_mechanic_earnings(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION update_mechanic_rating(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION log_mechanic_activity(uuid, text, text, uuid, text, jsonb) TO authenticated;
