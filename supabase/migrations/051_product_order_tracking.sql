-- Tracking fields and per-stage timestamps for product order fulfillment.

alter table public.product_orders
  add column if not exists tracking_number text,
  add column if not exists carrier text,
  add column if not exists processing_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz;

comment on column public.product_orders.tracking_number is 'Optional courier tracking code set when the order is marked shipped.';
comment on column public.product_orders.carrier is 'Optional courier / carrier name set when the order is marked shipped.';
comment on column public.product_orders.processing_at is 'When fulfillment moved to processing.';
comment on column public.product_orders.shipped_at is 'When the order was marked shipped.';
comment on column public.product_orders.delivered_at is 'When the order was marked delivered.';
