-- Vendors for MyGarage.

create table if not exists public.vendors (
  id text primary key,
  name text not null,
  email text not null,
  phone text not null default '',
  address text not null default '',
  rating numeric(3, 2) not null default 0,
  total_products integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists vendors_email_lower_key
  on public.vendors (lower(email));

create index if not exists vendors_created_at_idx on public.vendors (created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vendors_rating_range' and conrelid = 'public.vendors'::regclass
  ) then
    alter table public.vendors add constraint vendors_rating_range check (rating >= 0 and rating <= 5);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vendors_total_products_nonnegative' and conrelid = 'public.vendors'::regclass
  ) then
    alter table public.vendors add constraint vendors_total_products_nonnegative check (total_products >= 0);
  end if;
end $$;

create or replace function public.vendors_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vendors_set_updated_at on public.vendors;
create trigger vendors_set_updated_at
  before update on public.vendors
  for each row
  execute procedure public.vendors_set_updated_at();

alter table public.vendors enable row level security;

drop policy if exists "vendors_select_public" on public.vendors;
create policy "vendors_select_public"
  on public.vendors
  for select
  to anon, authenticated
  using (true);

comment on table public.vendors is 'Vendor profiles used by product ownership and admin/vendor dashboards.';

insert into public.vendors (
  id, name, email, phone, address, rating, total_products, created_at
)
values
  ('1', 'FilterPro Inc', 'sales@filterpro.com', '555-1001', '100 Industrial Blvd', 4.8, 3, '2023-06-15T00:00:00Z'),
  ('2', 'BrakeMaster Corp', 'contact@brakemaster.com', '555-1002', '200 Tech Drive', 4.6, 2, '2023-07-20T00:00:00Z')
on conflict (id) do nothing;
