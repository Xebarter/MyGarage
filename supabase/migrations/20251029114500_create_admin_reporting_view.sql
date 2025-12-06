/*
  # Admin Reporting Views for MyGarage

  1. Create views for simplified admin reporting
    - Sales report view
    - Inventory report view
    - Appointment report view
*/

-- Drop views if they exist
DROP VIEW IF EXISTS admin_sales_report;
DROP VIEW IF EXISTS admin_inventory_report;
DROP VIEW IF EXISTS admin_appointment_report;

-- Create sales report view
CREATE OR REPLACE VIEW admin_sales_report AS
SELECT 
  o.id AS order_id,
  o.customer_name,
  o.customer_email,
  o.total_amount,
  o.status,
  o.created_at AS order_date,
  COUNT(oi.id) AS items_count,
  a.full_name AS processed_by
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN admins a ON o.created_by = a.id
GROUP BY o.id, o.customer_name, o.customer_email, o.total_amount, o.status, o.created_at, a.full_name;

-- Create inventory report view
CREATE OR REPLACE VIEW admin_inventory_report AS
SELECT 
  p.id AS part_id,
  p.name AS part_name,
  p.sku,
  p.price,
  p.stock_quantity,
  c.name AS category_name,
  p.brand,
  CASE 
    WHEN p.stock_quantity = 0 THEN 'Out of Stock'
    WHEN p.stock_quantity < 5 THEN 'Low Stock'
    WHEN p.stock_quantity < 20 THEN 'Medium Stock'
    ELSE 'In Stock'
  END AS stock_status,
  p.created_at,
  a.full_name AS added_by
FROM parts p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN admins a ON p.created_by = a.id;

-- Create appointment report view
CREATE OR REPLACE VIEW admin_appointment_report AS
SELECT 
  a.id AS appointment_id,
  a.customer_name,
  a.customer_email,
  a.customer_phone,
  a.appointment_date,
  a.service_type,
  a.vehicle_make,
  a.vehicle_model,
  a.vehicle_year,
  a.status,
  a.created_at AS booking_date,
  adm.full_name AS managed_by
FROM appointments a
LEFT JOIN admins adm ON a.created_by = adm.id;

-- Grant select permissions on views to authenticated users
GRANT SELECT ON admin_sales_report TO authenticated;
GRANT SELECT ON admin_inventory_report TO authenticated;
GRANT SELECT ON admin_appointment_report TO authenticated;

-- Note: Views inherit RLS policies from their underlying tables, so explicit policies are not needed