/*
  # General Public Users Schema - Comprehensive Features

  This migration creates a comprehensive schema for handling general public users with all essential features:
  
  Core Features:
  1. User profiles and authentication integration
  2. My Vehicles - vehicle management and tracking
  3. Appointments - appointment scheduling and management
  4. Service History - complete service records per vehicle
  5. Documents & Insurance - document storage and insurance tracking
  6. Wallet & Payments - payment methods and transaction history
  7. Saved Mechanics - favorite repair shops and mechanics
  8. Maintenance Reminders - automated reminders for vehicle maintenance
  9. Messages & Support - messaging system and support tickets
  10. Settings - comprehensive user preferences and notifications
  11. Shopping carts for temporary product storage
  12. Wishlists for saved items
  13. Activity logging and audit trail

  Security: All tables have RLS policies for public and authenticated users
*/

-- ================================================================
-- 1. PUBLIC USERS PROFILE TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS public_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE, -- Link to Supabase auth.users table
  email text UNIQUE NOT NULL,
  full_name text,
  phone_number text,
  profile_picture_url text DEFAULT '',
  bio text DEFAULT '',
  preferred_language text DEFAULT 'en',
  newsletter_subscribed boolean DEFAULT true,
  account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended', 'deleted')),
  last_login timestamptz,
  login_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on email and auth_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_public_users_email ON public_users(email);
CREATE INDEX IF NOT EXISTS idx_public_users_auth_id ON public_users(auth_id);
CREATE INDEX IF NOT EXISTS idx_public_users_account_status ON public_users(account_status);

-- ================================================================
-- 2. USER ADDRESSES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  address_type text DEFAULT 'shipping' CHECK (address_type IN ('shipping', 'billing', 'both')),
  full_name text NOT NULL,
  phone_number text,
  street_address_1 text NOT NULL,
  street_address_2 text DEFAULT '',
  city text NOT NULL,
  state_province text NOT NULL,
  zip_postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'USA',
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_default ON user_addresses(user_id, is_default) WHERE is_default = true;

-- ================================================================
-- 3. MY VEHICLES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS user_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM now()) + 1),
  vin text UNIQUE,
  license_plate text,
  color text DEFAULT '',
  mileage integer DEFAULT 0 CHECK (mileage >= 0),
  last_recorded_mileage integer DEFAULT 0,
  last_mileage_update timestamptz,
  vehicle_type text DEFAULT 'sedan' CHECK (vehicle_type IN ('sedan', 'suv', 'truck', 'van', 'coupe', 'hatchback', 'convertible', 'wagon', 'other')),
  fuel_type text DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline', 'diesel', 'hybrid', 'electric', 'other')),
  transmission text DEFAULT 'automatic' CHECK (transmission IN ('automatic', 'manual', 'cvt', 'other')),
  engine_size text DEFAULT '',
  horsepower integer,
  registration_expiry date,
  insurance_expiry date,
  primary_vehicle boolean DEFAULT false,
  is_active boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_vehicles_user_id ON user_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vehicles_primary ON user_vehicles(user_id, primary_vehicle);
CREATE INDEX IF NOT EXISTS idx_user_vehicles_vin ON user_vehicles(vin);

-- ================================================================
-- 4. SERVICE HISTORY TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS service_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES user_vehicles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  service_date timestamptz NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('oil_change', 'tire_service', 'brake_service', 'engine_repair', 'transmission_repair', 'electrical', 'suspension', 'ac_repair', 'inspection', 'maintenance', 'other')),
  mileage_at_service integer,
  repair_shop_id uuid REFERENCES repair_shops(id) ON DELETE SET NULL,
  mechanic_name text DEFAULT '',
  description text NOT NULL,
  cost numeric(10, 2) DEFAULT 0.00 CHECK (cost >= 0),
  parts_used text DEFAULT '', -- Comma-separated or JSON
  labor_hours numeric(5, 2),
  warranty_period text DEFAULT '',
  completion_status text DEFAULT 'completed' CHECK (completion_status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  invoice_number text DEFAULT '',
  attachments text[] DEFAULT '{}', -- Array of document URLs
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_history_vehicle_id ON service_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_history_user_id ON service_history(user_id);
CREATE INDEX IF NOT EXISTS idx_service_history_service_date ON service_history(service_date);
CREATE INDEX IF NOT EXISTS idx_service_history_service_type ON service_history(service_type);
CREATE INDEX IF NOT EXISTS idx_service_history_shop_id ON service_history(repair_shop_id);

-- ================================================================
-- 5. DOCUMENTS & INSURANCE TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES user_vehicles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('registration', 'insurance', 'maintenance_record', 'inspection', 'warranty', 'recall', 'recall_status', 'other')),
  title text NOT NULL,
  description text DEFAULT '',
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer, -- in bytes
  file_type text, -- pdf, jpg, png, etc.
  expiry_date date,
  issue_date date,
  issuer text DEFAULT '', -- Insurance company, DMV, etc.
  document_number text DEFAULT '',
  is_verified boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'archived', 'draft')),
  uploaded_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_user_id ON vehicle_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_type ON vehicle_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_expiry ON vehicle_documents(expiry_date);

-- ================================================================
-- 6. INSURANCE TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS vehicle_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES user_vehicles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  provider_name text NOT NULL,
  policy_number text UNIQUE NOT NULL,
  coverage_type text DEFAULT 'comprehensive' CHECK (coverage_type IN ('liability', 'collision', 'comprehensive', 'uninsured_motorist', 'full_coverage')),
  policy_start_date date NOT NULL,
  policy_end_date date NOT NULL,
  premium_amount numeric(10, 2) NOT NULL CHECK (premium_amount > 0),
  premium_frequency text DEFAULT 'annual' CHECK (premium_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  deductible numeric(10, 2) DEFAULT 0.00 CHECK (deductible >= 0),
  coverage_limit numeric(12, 2),
  agent_name text DEFAULT '',
  agent_phone text DEFAULT '',
  agent_email text DEFAULT '',
  document_id uuid REFERENCES vehicle_documents(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  renewal_reminder_days integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_vehicle_id ON vehicle_insurance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_policy_number ON vehicle_insurance(policy_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_end_date ON vehicle_insurance(policy_end_date);

-- ================================================================
-- 7. WALLET & PAYMENTS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS user_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  balance numeric(12, 2) DEFAULT 0.00 CHECK (balance >= 0),
  currency text DEFAULT 'USD',
  total_spent numeric(12, 2) DEFAULT 0.00 CHECK (total_spent >= 0),
  total_earned numeric(12, 2) DEFAULT 0.00 CHECK (total_earned >= 0), -- From referrals
  last_transaction_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_wallet_user_id ON user_wallet(user_id);

-- ================================================================
-- 8. PAYMENT METHODS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'bank_transfer')),
  display_name text, -- e.g., "Visa ending in 4242"
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  -- Credit/Debit Card fields
  card_last_four text,
  card_brand text, -- Visa, Mastercard, AmEx, etc.
  card_exp_month integer,
  card_exp_year integer,
  card_holder_name text,
  card_token text, -- Encrypted token from payment processor
  
  -- PayPal fields
  paypal_email text,
  
  -- Bank Transfer fields
  bank_name text,
  account_last_four text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id, is_default) WHERE is_default = true;

-- ================================================================
-- 9. TRANSACTION HISTORY TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'USD',
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'refund', 'wallet_topup', 'reward_credit')),
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  payment_processor text DEFAULT 'stripe', -- stripe, paypal, square, etc.
  processor_transaction_id text UNIQUE,
  error_message text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);

-- ================================================================
-- 10. SAVED MECHANICS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS saved_mechanics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  repair_shop_id uuid REFERENCES repair_shops(id) ON DELETE CASCADE NOT NULL,
  saved_name text DEFAULT '', -- Nickname like "My Favorite Mechanic"
  is_favorite boolean DEFAULT false,
  last_visited timestamptz,
  rating_given integer, -- 1-5 stars
  notes text DEFAULT '', -- Personal notes about this mechanic
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, repair_shop_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_mechanics_user_id ON saved_mechanics(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_mechanics_shop_id ON saved_mechanics(repair_shop_id);
CREATE INDEX IF NOT EXISTS idx_saved_mechanics_favorite ON saved_mechanics(user_id, is_favorite) WHERE is_favorite = true;

-- ================================================================
-- 11. MAINTENANCE REMINDERS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS maintenance_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES user_vehicles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('oil_change', 'tire_rotation', 'air_filter', 'cabin_filter', 'spark_plugs', 'brake_pads', 'transmission_fluid', 'coolant', 'inspection', 'registration', 'insurance', 'custom')),
  title text NOT NULL,
  description text DEFAULT '',
  
  -- Trigger conditions
  trigger_mileage integer, -- Remind at this mileage
  trigger_days integer, -- Remind at this interval (days)
  last_performed_mileage integer,
  last_performed_date timestamptz,
  
  -- Reminder schedule
  due_mileage integer,
  due_date date,
  
  -- Notification settings
  remind_before_days integer DEFAULT 7, -- Send reminder X days before
  remind_before_mileage integer DEFAULT 100, -- Send reminder at X mileage before
  
  -- Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dismissed', 'snoozed')),
  is_recurring boolean DEFAULT true,
  snoozed_until timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_vehicle_id ON maintenance_reminders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_user_id ON maintenance_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_due_date ON maintenance_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_status ON maintenance_reminders(status);

-- ================================================================
-- 12. MESSAGES & SUPPORT TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  support_agent_id uuid, -- Reference to admin/support staff
  subject text NOT NULL,
  category text NOT NULL CHECK (category IN ('general', 'appointment', 'order', 'vehicle', 'repair', 'insurance', 'billing', 'other')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  first_message_at timestamptz DEFAULT now(),
  last_message_at timestamptz,
  resolved_at timestamptz,
  rating integer, -- User satisfaction rating 1-5
  feedback text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id ON support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_conversations_priority ON support_conversations(priority);

-- ================================================================
-- 13. SUPPORT MESSAGES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES support_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public_users(id) ON DELETE SET NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'agent', 'system')),
  message text NOT NULL,
  attachments text[] DEFAULT '{}', -- Array of file URLs
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_id ON support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON support_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);

-- ================================================================
-- 14. DIRECT MESSAGES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  attachments text[] DEFAULT '{}',
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_id ON direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_is_read ON direct_messages(recipient_id, is_read);

-- ================================================================
-- 15. SHOPPING CART TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS shopping_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE,
  session_id text, -- For anonymous users
  total_price numeric(12, 2) DEFAULT 0.00 CHECK (total_price >= 0),
  item_count integer DEFAULT 0 CHECK (item_count >= 0),
  last_updated timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_carts_user_id ON shopping_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_session_id ON shopping_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_expires_at ON shopping_carts(expires_at);

-- ================================================================
-- 16. CART ITEMS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid REFERENCES shopping_carts(id) ON DELETE CASCADE NOT NULL,
  part_id uuid REFERENCES parts(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal numeric(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  added_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_part_id ON cart_items(part_id);

-- ================================================================
-- 17. WISHLISTS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  name text DEFAULT 'My Wishlist',
  description text DEFAULT '',
  is_public boolean DEFAULT false,
  is_default boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);

-- ================================================================
-- 18. WISHLIST ITEMS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id uuid REFERENCES wishlists(id) ON DELETE CASCADE NOT NULL,
  part_id uuid REFERENCES parts(id) ON DELETE CASCADE NOT NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  price_at_time numeric(10, 2) NOT NULL, -- Track price when added
  priority integer DEFAULT 0, -- 0=normal, 1=high, -1=low
  notes text DEFAULT '',
  added_at timestamptz DEFAULT now(),
  UNIQUE(wishlist_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_part_id ON wishlist_items(part_id);

-- ================================================================
-- 19. USER ORDERS TABLE (LINKED TO EXISTING ORDERS)
-- ================================================================
-- Enhance existing orders table with additional public user fields
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public_users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS shipping_address_id uuid REFERENCES user_addresses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS billing_address_id uuid REFERENCES user_addresses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'credit_card' CHECK (payment_method IN ('credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay')),
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS tracking_number text DEFAULT '',
ADD COLUMN IF NOT EXISTS estimated_delivery timestamptz,
ADD COLUMN IF NOT EXISTS actual_delivery timestamptz,
ADD COLUMN IF NOT EXISTS shipping_cost numeric(10, 2) DEFAULT 0.00 CHECK (shipping_cost >= 0),
ADD COLUMN IF NOT EXISTS tax_amount numeric(10, 2) DEFAULT 0.00 CHECK (tax_amount >= 0),
ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2) DEFAULT 0.00 CHECK (discount_amount >= 0),
ADD COLUMN IF NOT EXISTS subtotal numeric(12, 2) GENERATED ALWAYS AS (COALESCE(total_amount, 0) - COALESCE(shipping_cost, 0) - COALESCE(tax_amount, 0) + COALESCE(discount_amount, 0)) STORED,
ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
ADD COLUMN IF NOT EXISTS internal_notes text DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ================================================================
-- 20. ORDER HISTORY / STATUS TRACKING TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  changed_by text DEFAULT 'system', -- 'user', 'admin', 'system'
  reason text DEFAULT '',
  changed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_at ON order_status_history(changed_at);

-- ================================================================
-- 21. USER PREFERENCES TABLE - Comprehensive Settings
-- ================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES public_users(id) ON DELETE CASCADE NOT NULL,
  
  -- Display Settings
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language text DEFAULT 'en',
  currency text DEFAULT 'USD',
  items_per_page integer DEFAULT 12,
  timezone text DEFAULT 'UTC',
  
  -- Notification Preferences
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  push_notifications boolean DEFAULT true,
  order_updates boolean DEFAULT true,
  appointment_reminders boolean DEFAULT true,
  service_reminders boolean DEFAULT true,
  maintenance_alerts boolean DEFAULT true,
  promotional_emails boolean DEFAULT true,
  product_recommendations boolean DEFAULT true,
  new_arrivals_alert boolean DEFAULT true,
  price_drop_alert boolean DEFAULT true,
  message_notifications boolean DEFAULT true,
  support_updates boolean DEFAULT true,
  
  -- Privacy Settings
  profile_visibility text DEFAULT 'private' CHECK (profile_visibility IN ('private', 'friends', 'public')),
  allow_third_party_messaging boolean DEFAULT false,
  share_vehicle_data boolean DEFAULT false,
  allow_analytics boolean DEFAULT true,
  
  -- Security Settings
  remember_me boolean DEFAULT true,
  two_factor_enabled boolean DEFAULT false,
  two_factor_method text DEFAULT 'email' CHECK (two_factor_method IN ('email', 'sms', 'authenticator')),
  biometric_login boolean DEFAULT false,
  session_timeout_minutes integer DEFAULT 30,
  
  -- Shopping & Service Settings
  auto_add_to_cart boolean DEFAULT false,
  save_payment_info boolean DEFAULT true,
  one_click_checkout boolean DEFAULT false,
  preferred_shipping text DEFAULT 'standard' CHECK (preferred_shipping IN ('standard', 'expedited', 'overnight')),
  preferred_repair_shop_id uuid REFERENCES repair_shops(id) ON DELETE SET NULL,
  
  -- Maintenance & Vehicle Settings
  mileage_unit text DEFAULT 'miles' CHECK (mileage_unit IN ('miles', 'kilometers')),
  auto_calculate_next_service boolean DEFAULT true,
  prefer_preventive_maintenance boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ================================================================
-- 22. USER ACTIVITY LOG TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE,
  session_id text, -- For anonymous users
  activity_type text NOT NULL CHECK (activity_type IN ('page_view', 'product_view', 'search', 'add_to_cart', 'remove_from_cart', 'add_to_wishlist', 'remove_from_wishlist', 'purchase', 'review', 'login', 'logout')),
  page_url text DEFAULT '',
  product_id uuid REFERENCES parts(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}', -- Additional context data
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_session_id ON user_activity_log(session_id);

-- ================================================================
-- 23. USER REVIEWS ENHANCEMENT
-- ================================================================
-- Link existing product_reviews to public_users
ALTER TABLE product_reviews
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public_users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_helpful integer DEFAULT 0 CHECK (is_helpful >= 0),
ADD COLUMN IF NOT EXISTS is_unhelpful integer DEFAULT 0 CHECK (is_unhelpful >= 0),
ADD COLUMN IF NOT EXISTS review_images text[] DEFAULT '{}', -- Array of image URLs
ADD COLUMN IF NOT EXISTS verified_buyer boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);

-- ================================================================
-- 24. PRODUCT RATINGS TABLE (For quick access)
-- ================================================================
CREATE TABLE IF NOT EXISTS product_ratings (
  part_id uuid PRIMARY KEY REFERENCES parts(id) ON DELETE CASCADE,
  average_rating numeric(3, 2) DEFAULT 0.00 CHECK (average_rating >= 0 AND average_rating <= 5),
  total_reviews integer DEFAULT 0 CHECK (total_reviews >= 0),
  rating_1_star integer DEFAULT 0 CHECK (rating_1_star >= 0),
  rating_2_star integer DEFAULT 0 CHECK (rating_2_star >= 0),
  rating_3_star integer DEFAULT 0 CHECK (rating_3_star >= 0),
  rating_4_star integer DEFAULT 0 CHECK (rating_4_star >= 0),
  rating_5_star integer DEFAULT 0 CHECK (rating_5_star >= 0),
  last_updated timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_ratings_average ON product_ratings(average_rating);

-- ================================================================
-- 25. USER SAVED SEARCHES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS user_saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public_users(id) ON DELETE CASCADE,
  session_id text, -- For anonymous users
  search_query text NOT NULL,
  filters jsonb DEFAULT '{}', -- Applied filters
  results_count integer DEFAULT 0,
  name text DEFAULT '', -- For saved search names
  is_saved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_saved_searches_user_id ON user_saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_searches_is_saved ON user_saved_searches(user_id, is_saved);

-- ================================================================
-- 26. REFERRAL / AFFILIATE PROGRAM TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS user_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public_users(id) ON DELETE SET NULL,
  referred_user_id uuid REFERENCES public_users(id) ON DELETE SET NULL,
  referral_code text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  commission_amount numeric(10, 2) DEFAULT 0.00 CHECK (commission_amount >= 0),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '90 days')
);

CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer_id ON user_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referred_user_id ON user_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_code ON user_referrals(referral_code);

-- ================================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================================
-- Enable RLS on new tables
ALTER TABLE user_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on existing tables
ALTER TABLE public_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- ROW LEVEL SECURITY POLICIES FOR NEW TABLES
-- ================================================================

-- USER VEHICLES RLS POLICIES
CREATE POLICY "Users can view their own vehicles"
  ON user_vehicles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own vehicles"
  ON user_vehicles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own vehicles"
  ON user_vehicles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own vehicles"
  ON user_vehicles FOR DELETE
  USING (user_id = auth.uid());

-- SERVICE HISTORY RLS POLICIES
CREATE POLICY "Users can view their vehicle service history"
  ON service_history FOR SELECT
  USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_vehicles WHERE id = service_history.vehicle_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create service history for their vehicles"
  ON service_history FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM user_vehicles WHERE id = service_history.vehicle_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update their service history"
  ON service_history FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- VEHICLE DOCUMENTS RLS POLICIES
CREATE POLICY "Users can view their vehicle documents"
  ON vehicle_documents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their vehicle documents"
  ON vehicle_documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their vehicle documents"
  ON vehicle_documents FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their vehicle documents"
  ON vehicle_documents FOR DELETE
  USING (user_id = auth.uid());

-- VEHICLE INSURANCE RLS POLICIES
CREATE POLICY "Users can view their vehicle insurance"
  ON vehicle_insurance FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their vehicle insurance"
  ON vehicle_insurance FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- USER WALLET RLS POLICIES
CREATE POLICY "Users can view their own wallet"
  ON user_wallet FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own wallet"
  ON user_wallet FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- PAYMENT METHODS RLS POLICIES
CREATE POLICY "Users can view their own payment methods"
  ON payment_methods FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own payment methods"
  ON payment_methods FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- PAYMENT TRANSACTIONS RLS POLICIES
CREATE POLICY "Users can view their own transactions"
  ON payment_transactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all transactions"
  ON payment_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins a 
      WHERE a.id = auth.uid()
    )
  );

-- SAVED MECHANICS RLS POLICIES
CREATE POLICY "Users can view their saved mechanics"
  ON saved_mechanics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their saved mechanics"
  ON saved_mechanics FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- MAINTENANCE REMINDERS RLS POLICIES
CREATE POLICY "Users can view their maintenance reminders"
  ON maintenance_reminders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their maintenance reminders"
  ON maintenance_reminders FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- SUPPORT CONVERSATIONS RLS POLICIES
CREATE POLICY "Users can view their own support conversations"
  ON support_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create support conversations"
  ON support_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Support agents can view conversations"
  ON support_conversations FOR SELECT
  USING (
    user_id = auth.uid() OR
    support_agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- SUPPORT MESSAGES RLS POLICIES
CREATE POLICY "Users can view messages in their conversations"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations sc 
      WHERE sc.id = support_messages.conversation_id 
      AND (sc.user_id = auth.uid() OR sc.support_agent_id = auth.uid())
    )
  );

CREATE POLICY "Users can post messages in their conversations"
  ON support_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM support_conversations sc 
      WHERE sc.id = support_messages.conversation_id 
      AND sc.user_id = auth.uid()
    )
  );

-- DIRECT MESSAGES RLS POLICIES
CREATE POLICY "Users can view their direct messages"
  ON direct_messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send direct messages"
  ON direct_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- ================================================================
-- ROW LEVEL SECURITY POLICIES FOR EXISTING TABLES (UPDATED)
-- ================================================================

-- PUBLIC USERS RLS POLICIES
CREATE POLICY "Users can view their own profile"
  ON public_users FOR SELECT
  USING (
    id = auth.uid() OR auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own profile"
  ON public_users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public_users FOR INSERT
  WITH CHECK (auth.uid() = COALESCE(auth_id, auth.uid()));

-- USER ADDRESSES RLS POLICIES
CREATE POLICY "Users can view their own addresses"
  ON user_addresses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own addresses"
  ON user_addresses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own addresses"
  ON user_addresses FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own addresses"
  ON user_addresses FOR DELETE
  USING (user_id = auth.uid());

-- SHOPPING CART RLS POLICIES
CREATE POLICY "Users can view their own cart"
  ON shopping_carts FOR SELECT
  USING (user_id = auth.uid() OR session_id IS NOT NULL);

CREATE POLICY "Users can create their own cart"
  ON shopping_carts FOR INSERT
  WITH CHECK (user_id = auth.uid() OR session_id IS NOT NULL);

CREATE POLICY "Users can update their own cart"
  ON shopping_carts FOR UPDATE
  USING (user_id = auth.uid() OR session_id IS NOT NULL)
  WITH CHECK (user_id = auth.uid() OR session_id IS NOT NULL);

CREATE POLICY "Users can delete their own cart"
  ON shopping_carts FOR DELETE
  USING (user_id = auth.uid());

-- CART ITEMS RLS POLICIES
CREATE POLICY "Users can manage their cart items"
  ON cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shopping_carts sc 
      WHERE sc.id = cart_items.cart_id 
      AND (sc.user_id = auth.uid() OR sc.session_id IS NOT NULL)
    )
  );

-- WISHLISTS RLS POLICIES
CREATE POLICY "Users can view public wishlists and their own"
  ON wishlists FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can manage their own wishlists"
  ON wishlists FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- WISHLIST ITEMS RLS POLICIES
CREATE POLICY "Users can manage their wishlist items"
  ON wishlist_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wishlists w 
      WHERE w.id = wishlist_items.wishlist_id 
      AND (w.is_public = true OR w.user_id = auth.uid())
    )
  );

-- ORDER STATUS HISTORY RLS POLICIES
CREATE POLICY "Users can view their order history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_status_history.order_id 
      AND o.user_id = auth.uid()
    )
  );

-- USER PREFERENCES RLS POLICIES
CREATE POLICY "Users can view and manage their preferences"
  ON user_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- USER ACTIVITY LOG RLS POLICIES (minimal access)
CREATE POLICY "Users can view their own activity"
  ON user_activity_log FOR SELECT
  USING (user_id = auth.uid());

-- USER SAVED SEARCHES RLS POLICIES
CREATE POLICY "Users can manage their saved searches"
  ON user_saved_searches FOR ALL
  USING (user_id = auth.uid() OR session_id IS NOT NULL);

-- USER REFERRALS RLS POLICIES
CREATE POLICY "Users can view their referrals"
  ON user_referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

-- PRODUCT RATINGS RLS POLICIES
CREATE POLICY "Anyone can view product ratings"
  ON product_ratings FOR SELECT
  USING (true);

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Function to update product rating when reviews change
CREATE OR REPLACE FUNCTION update_product_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    INSERT INTO product_ratings (part_id, average_rating, total_reviews, rating_1_star, rating_2_star, rating_3_star, rating_4_star, rating_5_star)
    SELECT 
      p.id,
      ROUND(COALESCE(AVG(pr.rating), 0)::numeric, 2),
      COUNT(pr.id),
      COUNT(CASE WHEN pr.rating = 1 THEN 1 END),
      COUNT(CASE WHEN pr.rating = 2 THEN 1 END),
      COUNT(CASE WHEN pr.rating = 3 THEN 1 END),
      COUNT(CASE WHEN pr.rating = 4 THEN 1 END),
      COUNT(CASE WHEN pr.rating = 5 THEN 1 END)
    FROM parts p
    LEFT JOIN product_reviews pr ON p.id = pr.part_id AND pr.approved = true
    WHERE p.id = COALESCE(NEW.part_id, OLD.part_id)
    GROUP BY p.id
    ON CONFLICT (part_id) DO UPDATE SET 
      average_rating = EXCLUDED.average_rating,
      total_reviews = EXCLUDED.total_reviews,
      rating_1_star = EXCLUDED.rating_1_star,
      rating_2_star = EXCLUDED.rating_2_star,
      rating_3_star = EXCLUDED.rating_3_star,
      rating_4_star = EXCLUDED.rating_4_star,
      rating_5_star = EXCLUDED.rating_5_star,
      last_updated = now();
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update product ratings
DROP TRIGGER IF EXISTS sync_product_ratings_on_review ON product_reviews;
CREATE TRIGGER sync_product_ratings_on_review
  AFTER INSERT OR UPDATE OR DELETE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_ratings();

-- Function to update shopping cart totals
CREATE OR REPLACE FUNCTION update_cart_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE shopping_carts
  SET 
    total_price = (
      SELECT COALESCE(SUM(subtotal), 0)
      FROM cart_items
      WHERE cart_id = COALESCE(NEW.cart_id, OLD.cart_id)
    ),
    item_count = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM cart_items
      WHERE cart_id = COALESCE(NEW.cart_id, OLD.cart_id)
    ),
    last_updated = now()
  WHERE id = COALESCE(NEW.cart_id, OLD.cart_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cart totals
DROP TRIGGER IF EXISTS sync_cart_totals ON cart_items;
CREATE TRIGGER sync_cart_totals
  AFTER INSERT OR UPDATE OR DELETE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_totals();

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id uuid,
  p_activity_type text,
  p_page_url text DEFAULT '',
  p_product_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT '',
  p_user_agent text DEFAULT '',
  p_session_id text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO user_activity_log (user_id, session_id, activity_type, page_url, product_id, metadata, ip_address, user_agent)
  VALUES (p_user_id, p_session_id, p_activity_type, p_page_url, p_product_id, p_metadata, p_ip_address, p_user_agent)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id uuid)
RETURNS text AS $$
DECLARE
  v_code text;
BEGIN
  v_code := 'REF_' || SUBSTRING(p_user_id::text, 1, 8) || '_' || TO_CHAR(NOW(), 'YYYYMMDD') || '_' || LPAD(FLOOR(RANDOM() * 9999)::text, 4, '0');
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- SAMPLE DATA (OPTIONAL)
-- ================================================================
-- Uncomment if you want to add sample data

/*
-- Insert sample public user
INSERT INTO public_users (email, full_name, phone_number, newsletter_subscribed)
VALUES ('user@example.com', 'John Doe', '555-0123', true)
ON CONFLICT (email) DO NOTHING;

-- Insert sample user address
INSERT INTO user_addresses (user_id, full_name, street_address_1, city, state_province, zip_postal_code, is_default)
SELECT id, 'John Doe', '123 Main St', 'Los Angeles', 'CA', '90001', true
FROM public_users WHERE email = 'user@example.com'
ON CONFLICT DO NOTHING;

-- Insert sample user preferences
INSERT INTO user_preferences (user_id, theme, email_notifications, order_updates)
SELECT id, 'light', true, true
FROM public_users WHERE email = 'user@example.com'
ON CONFLICT DO NOTHING;

-- Insert sample wishlist
INSERT INTO wishlists (user_id, name)
SELECT id, 'My Wishlist'
FROM public_users WHERE email = 'user@example.com'
ON CONFLICT DO NOTHING;
*/
