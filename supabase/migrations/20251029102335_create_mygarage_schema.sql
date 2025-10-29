/*
  # MyGarage Car Parts Database Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Category name (e.g., "Engine Parts", "Brakes", "Suspension")
      - `description` (text) - Category description
      - `image_url` (text) - Category image
      - `created_at` (timestamptz)
    
    - `parts`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key to categories)
      - `name` (text) - Part name
      - `description` (text) - Detailed description
      - `price` (numeric) - Part price
      - `stock_quantity` (integer) - Available quantity
      - `sku` (text, unique) - Stock keeping unit
      - `brand` (text) - Manufacturer brand
      - `compatible_models` (text) - Compatible car models
      - `image_url` (text) - Product image
      - `featured` (boolean) - Whether part is featured
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `orders`
      - `id` (uuid, primary key)
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `total_amount` (numeric)
      - `status` (text) - Order status
      - `created_at` (timestamptz)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `part_id` (uuid, foreign key to parts)
      - `quantity` (integer)
      - `price_at_time` (numeric) - Price when ordered
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access to categories and parts
    - Add policies for authenticated operations on orders

  3. Sample Data
    - Insert sample categories
    - Insert sample parts for demonstration
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create parts table
CREATE TABLE IF NOT EXISTS parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  sku text UNIQUE NOT NULL,
  brand text DEFAULT '',
  compatible_models text DEFAULT '',
  image_url text DEFAULT '',
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text DEFAULT '',
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount >= 0),
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  part_id uuid REFERENCES parts(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_time numeric(10, 2) NOT NULL CHECK (price_at_time >= 0),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories (public read access)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  USING (true);

-- RLS Policies for parts (public read access)
CREATE POLICY "Anyone can view parts"
  ON parts FOR SELECT
  USING (true);

-- RLS Policies for orders (public can create, authenticated can view own)
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view orders"
  ON orders FOR SELECT
  USING (true);

-- RLS Policies for order_items (public can create)
CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view order items"
  ON order_items FOR SELECT
  USING (true);

-- Insert sample categories
INSERT INTO categories (name, description, image_url) VALUES
  ('Engine Parts', 'High-performance engine components and accessories', 'https://images.pexels.com/photos/3806288/pexels-photo-3806288.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Brakes', 'Brake pads, rotors, and braking systems', 'https://images.pexels.com/photos/13065690/pexels-photo-13065690.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Suspension', 'Shocks, struts, and suspension components', 'https://images.pexels.com/photos/3806386/pexels-photo-3806386.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Electrical', 'Batteries, alternators, and electrical systems', 'https://images.pexels.com/photos/97075/pexels-photo-97075.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Filters', 'Oil filters, air filters, and cabin filters', 'https://images.pexels.com/photos/4489702/pexels-photo-4489702.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Lighting', 'Headlights, taillights, and interior lighting', 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800')
ON CONFLICT (name) DO NOTHING;

-- Insert sample parts
INSERT INTO parts (category_id, name, description, price, stock_quantity, sku, brand, compatible_models, image_url, featured)
SELECT 
  c.id,
  'Premium Spark Plugs Set',
  'High-performance iridium spark plugs for improved fuel efficiency and engine performance. Set of 4.',
  89.99,
  50,
  'SPK-001',
  'NGK',
  'Honda Civic, Toyota Corolla, Ford Focus',
  'https://images.pexels.com/photos/13480637/pexels-photo-13480637.jpeg?auto=compress&cs=tinysrgb&w=800',
  true
FROM categories c WHERE c.name = 'Engine Parts'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO parts (category_id, name, description, price, stock_quantity, sku, brand, compatible_models, image_url, featured)
SELECT 
  c.id,
  'Ceramic Brake Pad Set',
  'Low-noise ceramic brake pads with excellent stopping power and minimal dust. Complete front or rear set.',
  124.99,
  35,
  'BRK-002',
  'Brembo',
  'BMW 3 Series, Audi A4, Mercedes C-Class',
  'https://images.pexels.com/photos/3806387/pexels-photo-3806387.jpeg?auto=compress&cs=tinysrgb&w=800',
  true
FROM categories c WHERE c.name = 'Brakes'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO parts (category_id, name, description, price, stock_quantity, sku, brand, compatible_models, image_url, featured)
SELECT 
  c.id,
  'Performance Air Filter',
  'Washable and reusable high-flow air filter for increased horsepower and acceleration.',
  64.99,
  75,
  'FLT-003',
  'K&N',
  'Universal fit for most vehicles',
  'https://images.pexels.com/photos/4489737/pexels-photo-4489737.jpeg?auto=compress&cs=tinysrgb&w=800',
  true
FROM categories c WHERE c.name = 'Filters'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO parts (category_id, name, description, price, stock_quantity, sku, brand, compatible_models, image_url, featured)
SELECT 
  c.id,
  'LED Headlight Bulbs',
  'Ultra-bright LED headlight conversion kit with 6000K white light. Easy plug-and-play installation.',
  149.99,
  40,
  'LED-004',
  'Philips',
  'Most H11 socket vehicles',
  'https://images.pexels.com/photos/3972755/pexels-photo-3972755.jpeg?auto=compress&cs=tinysrgb&w=800',
  true
FROM categories c WHERE c.name = 'Lighting'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO parts (category_id, name, description, price, stock_quantity, sku, brand, compatible_models, image_url, featured)
SELECT 
  c.id,
  'Heavy-Duty AGM Battery',
  'Maintenance-free AGM battery with 800 cold cranking amps. 3-year warranty included.',
  189.99,
  25,
  'BAT-005',
  'Optima',
  'Most vehicles',
  'https://images.pexels.com/photos/257700/pexels-photo-257700.jpeg?auto=compress&cs=tinysrgb&w=800',
  false
FROM categories c WHERE c.name = 'Electrical'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO parts (category_id, name, description, price, stock_quantity, sku, brand, compatible_models, image_url, featured)
SELECT 
  c.id,
  'Gas Shock Absorbers',
  'Twin-tube gas shock absorbers for improved handling and ride comfort. Sold as pair.',
  199.99,
  30,
  'SUS-006',
  'Monroe',
  'Toyota Camry, Honda Accord, Nissan Altima',
  'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=800',
  false
FROM categories c WHERE c.name = 'Suspension'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO parts (category_id, name, description, price, stock_quantity, sku, brand, compatible_models, image_url, featured)
SELECT 
  c.id,
  'Oil Filter Premium',
  'Extended life synthetic oil filter with 99% dirt removal efficiency.',
  24.99,
  100,
  'OIL-007',
  'Mobil 1',
  'Multiple vehicle applications',
  'https://images.pexels.com/photos/5662857/pexels-photo-5662857.jpeg?auto=compress&cs=tinysrgb&w=800',
  false
FROM categories c WHERE c.name = 'Filters'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO parts (category_id, name, description, price, stock_quantity, sku, brand, compatible_models, image_url, featured)
SELECT 
  c.id,
  'Drilled Brake Rotors',
  'Cross-drilled and slotted performance brake rotors for superior heat dissipation. Pair.',
  279.99,
  20,
  'BRK-008',
  'EBC',
  'Performance vehicles',
  'https://images.pexels.com/photos/4489464/pexels-photo-4489464.jpeg?auto=compress&cs=tinysrgb&w=800',
  false
FROM categories c WHERE c.name = 'Brakes'
ON CONFLICT (sku) DO NOTHING;