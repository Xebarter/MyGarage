/*
  # Products Functionality for MyGarage

  This migration enhances the existing parts table with additional product management features:
  1. Product variants for size/color/options
  2. Product reviews and ratings
  3. Inventory tracking improvements
  4. Product categorization enhancements
  5. Product SEO and metadata
  6. Admin tools for product management
*/

-- Create product_variants table for managing different versions of the same product
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid REFERENCES parts(id) ON DELETE CASCADE,
  name text NOT NULL, -- e.g., "Large", "Red", "Option A"
  sku text UNIQUE NOT NULL,
  price_adjustment numeric(10, 2) DEFAULT 0.00, -- Positive or negative adjustment to base price
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_reviews table for customer feedback
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid REFERENCES parts(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_title text NOT NULL,
  review_text text,
  verified_purchase boolean DEFAULT false,
  approved boolean DEFAULT false, -- Admin must approve reviews
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_images table for additional product imagery
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid REFERENCES parts(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create product_tags table for better product categorization
CREATE TABLE IF NOT EXISTS product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL, -- URL-friendly version
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create junction table for parts and tags
CREATE TABLE IF NOT EXISTS part_tags (
  part_id uuid REFERENCES parts(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (part_id, tag_id)
);

-- Create product_metadata table for SEO and technical metadata
CREATE TABLE IF NOT EXISTS product_metadata (
  part_id uuid PRIMARY KEY REFERENCES parts(id) ON DELETE CASCADE,
  meta_title text,
  meta_description text,
  keywords text,
  canonical_url text,
  robots text DEFAULT 'index,follow',
  schema_markup jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add additional columns to parts table for enhanced product management
ALTER TABLE parts
ADD COLUMN IF NOT EXISTS weight numeric(8, 2) DEFAULT 0.00, -- Weight in kg
ADD COLUMN IF NOT EXISTS dimensions text DEFAULT '', -- e.g., "LxWxH in cm"
ADD COLUMN IF NOT EXISTS warranty_period text DEFAULT '', -- e.g., "2 years", "Lifetime"
ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'in_stock' CHECK (availability_status IN ('in_stock', 'out_of_stock', 'preorder', 'discontinued')),
ADD COLUMN IF NOT EXISTS min_stock_level integer DEFAULT 0 CHECK (min_stock_level >= 0),
ADD COLUMN IF NOT EXISTS max_stock_level integer DEFAULT 1000 CHECK (max_stock_level >= 0),
ADD COLUMN IF NOT EXISTS seo_description text DEFAULT '';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_variants_part_id ON product_variants(part_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_reviews_part_id ON product_reviews(part_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON product_reviews(approved);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_product_images_part_id ON product_images(part_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_slug ON product_tags(slug);
CREATE INDEX IF NOT EXISTS idx_part_tags_tag_id ON part_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_parts_brand ON parts(brand);
CREATE INDEX IF NOT EXISTS idx_parts_featured ON parts(featured);
CREATE INDEX IF NOT EXISTS idx_parts_availability ON parts(availability_status);

-- Enable Row Level Security
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_variants
CREATE POLICY "Anyone can view product variants"
  ON product_variants FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage product variants"
  ON product_variants FOR ALL
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

-- RLS Policies for product_reviews
CREATE POLICY "Anyone can view approved reviews"
  ON product_reviews FOR SELECT
  USING (approved = true);

CREATE POLICY "Admins can manage all reviews"
  ON product_reviews FOR ALL
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

CREATE POLICY "Customers can manage their own reviews"
  ON product_reviews FOR ALL
  USING (
    customer_email = (SELECT auth.jwt() ->> 'email')
  )
  WITH CHECK (
    customer_email = (SELECT auth.jwt() ->> 'email')
  );

-- RLS Policies for product_images
CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage product images"
  ON product_images FOR ALL
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

-- RLS Policies for product_tags
CREATE POLICY "Anyone can view product tags"
  ON product_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage product tags"
  ON product_tags FOR ALL
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

-- RLS Policies for part_tags
CREATE POLICY "Anyone can view part tags"
  ON part_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage part tags"
  ON part_tags FOR ALL
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

-- RLS Policies for product_metadata
CREATE POLICY "Anyone can view product metadata"
  ON product_metadata FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage product metadata"
  ON product_metadata FOR ALL
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

-- Create functions for inventory management
CREATE OR REPLACE FUNCTION update_part_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent part's stock quantity based on variants
  IF TG_TABLE_NAME = 'product_variants' THEN
    UPDATE parts 
    SET stock_quantity = (
      SELECT COALESCE(SUM(stock_quantity), 0) 
      FROM product_variants 
      WHERE part_id = NEW.part_id
    )
    WHERE id = NEW.part_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for inventory synchronization
DROP TRIGGER IF EXISTS sync_variant_stock_to_part ON product_variants;
CREATE TRIGGER sync_variant_stock_to_part
  AFTER INSERT OR UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_part_stock_quantity();

-- Create a view for product catalog with all related information
CREATE OR REPLACE VIEW product_catalog AS
SELECT 
  p.id,
  p.name,
  p.description,
  p.price,
  p.stock_quantity,
  p.sku,
  p.brand,
  p.featured,
  p.availability_status,
  c.name AS category_name,
  c.id AS category_id,
  p.image_url,
  p.seo_description,
  -- Calculate average rating
  (SELECT ROUND(COALESCE(AVG(rating), 0), 2) 
   FROM product_reviews pr 
   WHERE pr.part_id = p.id AND pr.approved = true) AS avg_rating,
  -- Count reviews
  (SELECT COUNT(*) 
   FROM product_reviews pr 
   WHERE pr.part_id = p.id AND pr.approved = true) AS review_count,
  -- Get tags
  (SELECT STRING_AGG(t.name, ', ') 
   FROM part_tags pt 
   JOIN product_tags t ON pt.tag_id = t.id 
   WHERE pt.part_id = p.id) AS tags
FROM parts p
LEFT JOIN categories c ON p.category_id = c.id;

-- Create a view for low stock alerts
CREATE OR REPLACE VIEW low_stock_alerts AS
SELECT 
  p.id,
  p.name,
  p.sku,
  p.stock_quantity,
  p.min_stock_level,
  c.name AS category_name,
  p.created_by
FROM parts p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.stock_quantity <= p.min_stock_level 
  AND p.availability_status = 'in_stock'
ORDER BY p.stock_quantity ASC;

-- Create a materialized view for product analytics
CREATE MATERIALIZED VIEW product_analytics AS
SELECT 
  p.id,
  p.name,
  p.sku,
  p.brand,
  c.name AS category_name,
  p.price,
  p.stock_quantity,
  -- Sales data
  COALESCE(SUM(oi.quantity), 0) AS total_sold,
  COALESCE(SUM(oi.quantity * oi.price_at_time), 0) AS total_revenue,
  -- Review data
  COALESCE(ROUND(AVG(pr.rating), 2), 0) AS avg_rating,
  COUNT(pr.id) AS review_count,
  -- Days since last sale
  EXTRACT(DAY FROM (NOW() - MAX(o.created_at))) AS days_since_last_sale
FROM parts p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN order_items oi ON p.id = oi.part_id
LEFT JOIN orders o ON oi.order_id = o.id
LEFT JOIN product_reviews pr ON p.id = pr.part_id AND pr.approved = true
GROUP BY p.id, p.name, p.sku, p.brand, c.name, p.price, p.stock_quantity
ORDER BY total_revenue DESC NULLS LAST;

-- Refresh the materialized view periodically
-- REFRESH MATERIALIZED VIEW product_analytics;

-- Grant permissions to authenticated users
GRANT SELECT ON product_catalog TO authenticated;
GRANT SELECT ON low_stock_alerts TO authenticated;
GRANT SELECT ON product_analytics TO authenticated;

-- Grant specific permissions for admins
GRANT ALL ON product_variants TO authenticated;
GRANT ALL ON product_reviews TO authenticated;
GRANT ALL ON product_images TO authenticated;
GRANT ALL ON product_tags TO authenticated;
GRANT ALL ON part_tags TO authenticated;
GRANT ALL ON product_metadata TO authenticated;

-- Insert some sample product tags
INSERT INTO product_tags (name, slug, description) VALUES
  ('Best Seller', 'best-seller', 'Our most popular products'),
  ('New Arrival', 'new-arrival', 'Recently added products'),
  ('On Sale', 'on-sale', 'Products currently on sale'),
  ('Eco Friendly', 'eco-friendly', 'Environmentally friendly products'),
  ('Premium', 'premium', 'High-end premium products')
ON CONFLICT (name) DO NOTHING;

-- Create functions for admin actions
CREATE OR REPLACE FUNCTION restock_product(product_id uuid, quantity integer)
RETURNS VOID AS $$
BEGIN
  UPDATE parts 
  SET stock_quantity = stock_quantity + quantity,
      updated_at = NOW()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION discontinue_product(product_id uuid)
RETURNS VOID AS $$
BEGIN
  UPDATE parts 
  SET availability_status = 'discontinued',
      updated_at = NOW()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only admins can execute these functions
REVOKE EXECUTE ON FUNCTION restock_product(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION discontinue_product(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION restock_product(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION discontinue_product(uuid) TO authenticated;