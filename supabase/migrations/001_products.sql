-- Products catalog for MyGarage. Safe on fresh DBs and on DBs that already ran an older version of this file.
-- Product IDs stay text for compatibility with mock order data in lib/db.ts.

-- ---------------------------------------------------------------------------
-- Table (create if missing)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id text primary key,
  name text not null,
  description text not null default '',
  price numeric(12, 2) not null,
  compare_at_price numeric(12, 2),
  image text not null default '',
  images jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  featured_request_pending boolean not null default false,
  published boolean not null default true,
  category text not null default '',
  subcategory text not null default '',
  brand text not null default '',
  stock integer not null default 0,
  reserved_stock integer not null default 0,
  low_stock_threshold integer not null default 0,
  sku text not null default '',
  slug text not null default '',
  tags text[] not null default '{}',
  weight_kg numeric(10, 3),
  vendor_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Additive upgrades (idempotent)
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists compare_at_price numeric(12, 2);
alter table public.products add column if not exists images jsonb;
update public.products set images = '[]'::jsonb where images is null;
alter table public.products alter column images set default '[]'::jsonb;
alter table public.products alter column images set not null;

alter table public.products add column if not exists published boolean;
update public.products set published = true where published is null;
alter table public.products alter column published set default true;
alter table public.products alter column published set not null;

alter table public.products add column if not exists subcategory text not null default '';
alter table public.products add column if not exists slug text not null default '';
alter table public.products add column if not exists tags text[] not null default '{}';
alter table public.products add column if not exists weight_kg numeric(10, 3);
alter table public.products add column if not exists reserved_stock integer not null default 0;
alter table public.products add column if not exists low_stock_threshold integer not null default 0;
alter table public.products add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Data integrity
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_price_nonnegative' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products add constraint products_price_nonnegative check (price >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_compare_at_price_nonnegative' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products add constraint products_compare_at_price_nonnegative check (
      compare_at_price is null or compare_at_price >= 0
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_stock_nonnegative' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products add constraint products_stock_nonnegative check (stock >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_reserved_stock_nonnegative' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products add constraint products_reserved_stock_nonnegative check (reserved_stock >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_reserved_lte_stock' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products add constraint products_reserved_lte_stock check (reserved_stock <= stock);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_low_stock_threshold_nonnegative' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products add constraint products_low_stock_threshold_nonnegative check (low_stock_threshold >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_images_is_array' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products add constraint products_images_is_array check (jsonb_typeof(images) = 'array');
  end if;
end $$;

create unique index if not exists products_vendor_sku_lower_key
  on public.products (vendor_id, lower(sku))
  where sku <> '';

create unique index if not exists products_slug_lower_key
  on public.products (lower(slug))
  where slug <> '';

-- ---------------------------------------------------------------------------
-- Query support (pg_trgm required for name search index)
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm;

create index if not exists products_vendor_id_idx on public.products (vendor_id);
create index if not exists products_featured_idx on public.products (featured) where featured = true;
create index if not exists products_category_idx on public.products (category);
create index if not exists products_brand_idx on public.products (brand);
create index if not exists products_published_idx on public.products (published) where published = true;
create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_tags_gin_idx on public.products using gin (tags);
create index if not exists products_name_trgm_idx on public.products using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.products_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row
  execute procedure public.products_set_updated_at();

comment on table public.products is 'Vendor catalog items; storefront reads use published = true when enforced in app.';
comment on column public.products.compare_at_price is 'Optional list/was price for display; sale logic can live in app.';
comment on column public.products.reserved_stock is 'Quantity held for pending orders; available is stock minus reserved_stock.';
comment on column public.products.low_stock_threshold is 'Alert when stock at or below this value.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
  on public.products
  for select
  to anon, authenticated
  using (true);

-- Mutations are expected via service role (API routes); no insert/update/delete for anon/authenticated unless you add vendor policies later.

-- ---------------------------------------------------------------------------
-- Storage: product images
-- Paths: e.g. {vendor_id}/{product_id}/main.jpg in product-images;
--         optional WebP/resize outputs in product-thumbnails.
-- Public URLs: /storage/v1/object/public/<bucket_id>/<path>
-- Uploads from the app typically use the service role (bypasses RLS). For
-- browser uploads with the anon key, add INSERT/UPDATE policies scoped to your auth model.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'product-images',
    'product-images',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
  ),
  (
    'product-thumbnails',
    'product-thumbnails',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_storage_select_public" on storage.objects;
create policy "product_storage_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id in ('product-images', 'product-thumbnails'));

comment on column public.products.image is 'Primary image URL or path; often a public Storage URL under bucket product-images.';
comment on column public.products.images is 'JSON array of extra image URLs; entries usually point to product-images or product-thumbnails.';

-- ---------------------------------------------------------------------------
-- Seed (matches lib/data/product-seed.ts). Re-run safe: skips existing IDs.
-- ---------------------------------------------------------------------------
insert into public.products (
  id, name, description, price, image, featured, featured_request_pending,
  category, brand, stock, sku, vendor_id, created_at
)
values
  ('1', 'Premium Oil Filter', 'High-performance oil filter for all vehicles', 12.99,
   '/products/oil-filter.jpg', true, false, 'Filters', 'FilterPro', 150, 'OF-001', '1', '2024-01-15T00:00:00Z'),
  ('2', 'Brake Pads Set', 'OEM-quality brake pads for smooth braking', 45.99,
   '/products/brake-pads.jpg', true, false, 'Braking', 'BrakeMaster', 87, 'BP-002', '2', '2024-01-20T00:00:00Z'),
  ('3', 'Engine Air Filter', 'Improves air flow and engine efficiency', 18.50,
   '/products/air-filter.jpg', true, false, 'Filters', 'FilterPro', 200, 'AF-003', '1', '2024-02-01T00:00:00Z'),
  ('4', 'Spark Plugs (4-Pack)', 'Precision engineered spark plugs', 24.99,
   '/products/spark-plugs.jpg', true, false, 'Ignition', 'SparkMax', 300, 'SP-004', '2', '2024-02-05T00:00:00Z'),
  ('5', 'Transmission Fluid', 'Premium transmission fluid for smooth shifting', 35.50,
   '/products/transmission-fluid.jpg', false, false, 'Fluids', 'FluidDynamics', 120, 'TF-005', '1', '2024-02-10T00:00:00Z'),
  ('6', 'Car Battery 12V 100Ah', 'Heavy-duty car battery with long lifespan', 129.99,
   '/products/battery.jpg', false, false, 'Electrical', 'PowerCell', 45, 'CB-006', '2', '2024-02-15T00:00:00Z')
on conflict (id) do nothing;
