-- Provider-listed services with list prices (indicative; not checkout totals).

create table if not exists public.vendor_service_listings (
  id text primary key,
  vendor_id text not null references public.vendors(id) on delete cascade,
  category_id text not null,
  service_name text not null,
  price_ugx numeric(12, 2) not null default 0,
  currency text not null default 'UGX',
  status text not null default 'active',
  eta_minutes integer,
  description text not null default '',
  mobile_available boolean not null default false,
  emergency boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_service_listings_price_nonnegative check (price_ugx >= 0),
  constraint vendor_service_listings_status_valid check (status in ('active', 'paused')),
  constraint vendor_service_listings_category_not_blank check (length(trim(category_id)) > 0),
  constraint vendor_service_listings_service_not_blank check (length(trim(service_name)) > 0)
);

create unique index if not exists vendor_service_listings_vendor_category_service_uidx
  on public.vendor_service_listings (vendor_id, category_id, service_name);

create index if not exists vendor_service_listings_vendor_id_idx
  on public.vendor_service_listings (vendor_id);

create index if not exists vendor_service_listings_category_id_idx
  on public.vendor_service_listings (category_id);

create index if not exists vendor_service_listings_active_service_idx
  on public.vendor_service_listings (service_name)
  where status = 'active';

create or replace function public.vendor_service_listings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vendor_service_listings_set_updated_at on public.vendor_service_listings;
create trigger vendor_service_listings_set_updated_at
  before update on public.vendor_service_listings
  for each row
  execute procedure public.vendor_service_listings_set_updated_at();

alter table public.vendor_service_listings enable row level security;

-- Public can read active listings (for price ranges). Writes go through service-role API.
drop policy if exists "vendor_service_listings_select_active" on public.vendor_service_listings;
create policy "vendor_service_listings_select_active"
  on public.vendor_service_listings
  for select
  to anon, authenticated
  using (status = 'active');
