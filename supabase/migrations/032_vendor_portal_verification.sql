-- Vendor + service-provider portal verification flags.
-- One Supabase auth user can access multiple portals; vendor/services portals remain
-- inactive until approved by an admin.

alter table public.vendors
  add column if not exists vendor_verified boolean not null default false;

alter table public.vendors
  add column if not exists services_verified boolean not null default false;

create index if not exists vendors_vendor_verified_idx on public.vendors (vendor_verified);
create index if not exists vendors_services_verified_idx on public.vendors (services_verified);

