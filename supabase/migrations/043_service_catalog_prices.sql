-- Admin-owned platform prices for buyer-facing service catalog (defaults for all jobs).
-- Vendors / providers list services only; price_ugx is always mirrored from here.

CREATE TABLE IF NOT EXISTS public.service_catalog_prices (
  category_id text NOT NULL,
  service_name text NOT NULL,
  price_ugx numeric(12, 2) NOT NULL DEFAULT 0 CHECK (price_ugx >= 0),
  currency text NOT NULL DEFAULT 'UGX',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_catalog_prices_pkey PRIMARY KEY (category_id, service_name)
);

CREATE INDEX IF NOT EXISTS service_catalog_prices_updated_at_idx
  ON public.service_catalog_prices (updated_at DESC);

COMMENT ON TABLE public.service_catalog_prices IS
  'Platform job prices set by admin; providers cannot override.';

ALTER TABLE public.service_catalog_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read service catalog prices" ON public.service_catalog_prices;
CREATE POLICY "Anyone can read service catalog prices"
  ON public.service_catalog_prices
  FOR SELECT
  USING (true);

-- Writes go through service role / admin API only (no public write policy).
