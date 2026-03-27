-- Buyer-specific entities for MyGarage.
-- Keeps customer identity in public.customers and adds addresses, wishlist, and support tickets.

create table if not exists public.buyer_addresses (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  label text not null default '',
  full_address text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_addresses_customer_id_idx on public.buyer_addresses (customer_id);
create index if not exists buyer_addresses_default_idx on public.buyer_addresses (customer_id, is_default);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_addresses_label_not_blank' and conrelid = 'public.buyer_addresses'::regclass
  ) then
    alter table public.buyer_addresses add constraint buyer_addresses_label_not_blank check (length(trim(label)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_addresses_full_address_not_blank' and conrelid = 'public.buyer_addresses'::regclass
  ) then
    alter table public.buyer_addresses add constraint buyer_addresses_full_address_not_blank check (length(trim(full_address)) > 0);
  end if;
end $$;

create unique index if not exists buyer_addresses_one_default_per_customer_key
  on public.buyer_addresses (customer_id)
  where is_default = true;

create or replace function public.buyer_addresses_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists buyer_addresses_set_updated_at on public.buyer_addresses;
create trigger buyer_addresses_set_updated_at
  before update on public.buyer_addresses
  for each row
  execute procedure public.buyer_addresses_set_updated_at();

alter table public.buyer_addresses enable row level security;

drop policy if exists "buyer_addresses_select_public" on public.buyer_addresses;
create policy "buyer_addresses_select_public"
  on public.buyer_addresses
  for select
  to anon, authenticated
  using (true);

create table if not exists public.buyer_wishlist_items (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name text not null default '',
  price_snapshot numeric(12, 2) not null default 0,
  category_snapshot text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_wishlist_items_customer_id_idx on public.buyer_wishlist_items (customer_id);
create index if not exists buyer_wishlist_items_product_id_idx on public.buyer_wishlist_items (product_id);
create index if not exists buyer_wishlist_items_created_at_idx on public.buyer_wishlist_items (created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_wishlist_items_price_snapshot_nonnegative' and conrelid = 'public.buyer_wishlist_items'::regclass
  ) then
    alter table public.buyer_wishlist_items add constraint buyer_wishlist_items_price_snapshot_nonnegative check (price_snapshot >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_wishlist_items_product_name_not_blank' and conrelid = 'public.buyer_wishlist_items'::regclass
  ) then
    alter table public.buyer_wishlist_items add constraint buyer_wishlist_items_product_name_not_blank check (length(trim(product_name)) > 0);
  end if;
end $$;

create unique index if not exists buyer_wishlist_items_customer_product_key
  on public.buyer_wishlist_items (customer_id, product_id)
  where product_id is not null;

create or replace function public.buyer_wishlist_items_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists buyer_wishlist_items_set_updated_at on public.buyer_wishlist_items;
create trigger buyer_wishlist_items_set_updated_at
  before update on public.buyer_wishlist_items
  for each row
  execute procedure public.buyer_wishlist_items_set_updated_at();

alter table public.buyer_wishlist_items enable row level security;

drop policy if exists "buyer_wishlist_items_select_public" on public.buyer_wishlist_items;
create policy "buyer_wishlist_items_select_public"
  on public.buyer_wishlist_items
  for select
  to anon, authenticated
  using (true);

create table if not exists public.buyer_support_tickets (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  subject text not null default '',
  message text not null default '',
  order_id text,
  status text not null default 'open',
  priority text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_support_tickets_customer_id_idx on public.buyer_support_tickets (customer_id);
create index if not exists buyer_support_tickets_status_idx on public.buyer_support_tickets (status);
create index if not exists buyer_support_tickets_created_at_idx on public.buyer_support_tickets (created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_support_tickets_subject_not_blank' and conrelid = 'public.buyer_support_tickets'::regclass
  ) then
    alter table public.buyer_support_tickets add constraint buyer_support_tickets_subject_not_blank check (length(trim(subject)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_support_tickets_message_not_blank' and conrelid = 'public.buyer_support_tickets'::regclass
  ) then
    alter table public.buyer_support_tickets add constraint buyer_support_tickets_message_not_blank check (length(trim(message)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_support_tickets_status_valid' and conrelid = 'public.buyer_support_tickets'::regclass
  ) then
    alter table public.buyer_support_tickets add constraint buyer_support_tickets_status_valid check (
      status in ('open', 'in_progress', 'resolved', 'closed')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_support_tickets_priority_valid' and conrelid = 'public.buyer_support_tickets'::regclass
  ) then
    alter table public.buyer_support_tickets add constraint buyer_support_tickets_priority_valid check (
      priority in ('low', 'normal', 'high', 'urgent')
    );
  end if;
end $$;

create or replace function public.buyer_support_tickets_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists buyer_support_tickets_set_updated_at on public.buyer_support_tickets;
create trigger buyer_support_tickets_set_updated_at
  before update on public.buyer_support_tickets
  for each row
  execute procedure public.buyer_support_tickets_set_updated_at();

alter table public.buyer_support_tickets enable row level security;

drop policy if exists "buyer_support_tickets_select_public" on public.buyer_support_tickets;
create policy "buyer_support_tickets_select_public"
  on public.buyer_support_tickets
  for select
  to anon, authenticated
  using (true);

comment on table public.buyer_addresses is 'Saved delivery addresses per customer.';
comment on table public.buyer_wishlist_items is 'Customer wishlist records with optional product link and snapshots.';
comment on table public.buyer_support_tickets is 'Buyer support requests for account, order, and refund issues.';
