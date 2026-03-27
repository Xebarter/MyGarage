-- Customers for MyGarage.
-- This migration moves buyer/customer persistence to Supabase.

create table if not exists public.customers (
  id text primary key,
  name text not null,
  email text not null,
  phone text not null default '',
  address text not null default '',
  total_orders integer not null default 0,
  total_spent numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_email_lower_key
  on public.customers (lower(email));

create index if not exists customers_created_at_idx on public.customers (created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'customers_total_orders_nonnegative' and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers add constraint customers_total_orders_nonnegative check (total_orders >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'customers_total_spent_nonnegative' and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers add constraint customers_total_spent_nonnegative check (total_spent >= 0);
  end if;
end $$;

create or replace function public.customers_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row
  execute procedure public.customers_set_updated_at();

alter table public.customers enable row level security;

drop policy if exists "customers_select_public" on public.customers;
create policy "customers_select_public"
  on public.customers
  for select
  to anon, authenticated
  using (true);

comment on table public.customers is 'Buyer/customer profiles and aggregate order stats.';

insert into public.customers (
  id, name, email, phone, address, total_orders, total_spent, created_at
)
values
  ('1', 'John Smith', 'john@example.com', '555-0101', '123 Main St, Anytown', 5, 487.50, '2024-01-10T00:00:00Z'),
  ('2', 'Sarah Johnson', 'sarah@example.com', '555-0102', '456 Oak Ave, Somewhere', 12, 1250.75, '2024-01-05T00:00:00Z'),
  ('3', 'Mike Wilson', 'mike@example.com', '555-0103', '789 Pine Rd, Elsewhere', 3, 245.99, '2024-02-01T00:00:00Z')
on conflict (id) do nothing;
