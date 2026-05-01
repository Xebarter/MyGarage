-- Single-query aggregates for the admin vendor directory header (large vendor counts).
--
-- Ensures verification columns exist first so this file can be run alone in the SQL editor
-- even if 032_vendor_portal_verification.sql was not applied yet.

alter table public.vendors
  add column if not exists vendor_verified boolean not null default false;

alter table public.vendors
  add column if not exists services_verified boolean not null default false;

create index if not exists vendors_vendor_verified_idx on public.vendors (vendor_verified);
create index if not exists vendors_services_verified_idx on public.vendors (services_verified);

-- Output column names must not match table columns unqualified inside the body (shadowing).
create or replace function public.admin_vendors_directory_stats()
returns table (
  total bigint,
  vendor_verified bigint,
  services_verified bigint,
  products_sum bigint,
  rating_avg numeric
)
language sql
stable
parallel safe
as $$
  select
    count(*)::bigint,
    count(*) filter (where coalesce(v.vendor_verified, false))::bigint,
    count(*) filter (where coalesce(v.services_verified, false))::bigint,
    coalesce(sum(v.total_products), 0)::bigint,
    coalesce(avg(v.rating::numeric), 0)::numeric
  from public.vendors v;
$$;

comment on function public.admin_vendors_directory_stats() is
  'Platform-wide vendor aggregates for admin UI. Callable with service role only.';

revoke all on function public.admin_vendors_directory_stats() from public;
grant execute on function public.admin_vendors_directory_stats() to service_role;
