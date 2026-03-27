-- Products.vendor_id is not FK-enforced; checkout_line_items and settlements require a real vendors row.
-- Backfill minimal vendor rows for any product vendor_id that has no vendors match (e.g. seed data
-- after vendors were cleared, or imports).

insert into public.vendors (
  id,
  name,
  email,
  phone,
  address,
  rating,
  total_products
)
select distinct
  p.vendor_id,
  'Seller ' || left(p.vendor_id, 24),
  'dangling-vendor+' || md5(p.vendor_id) || '@mygarage.local',
  '',
  '',
  0,
  0
from public.products p
where not exists (
  select 1 from public.vendors v where v.id = p.vendor_id
)
on conflict (id) do nothing;
