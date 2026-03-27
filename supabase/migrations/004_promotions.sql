-- Promotions and ad applications for MyGarage.

create table if not exists public.promotions (
  id text primary key,
  code text not null,
  description text not null default '',
  discount_type text not null,
  discount_value numeric(12, 2) not null,
  max_uses integer not null default 0,
  current_uses integer not null default 0,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists promotions_code_lower_key
  on public.promotions (lower(code));

create index if not exists promotions_active_idx on public.promotions (active) where active = true;
create index if not exists promotions_valid_until_idx on public.promotions (valid_until);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'promotions_discount_type_valid' and conrelid = 'public.promotions'::regclass
  ) then
    alter table public.promotions add constraint promotions_discount_type_valid check (
      discount_type in ('percentage', 'fixed')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'promotions_discount_value_nonnegative' and conrelid = 'public.promotions'::regclass
  ) then
    alter table public.promotions add constraint promotions_discount_value_nonnegative check (discount_value >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'promotions_max_uses_nonnegative' and conrelid = 'public.promotions'::regclass
  ) then
    alter table public.promotions add constraint promotions_max_uses_nonnegative check (max_uses >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'promotions_current_uses_nonnegative' and conrelid = 'public.promotions'::regclass
  ) then
    alter table public.promotions add constraint promotions_current_uses_nonnegative check (current_uses >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'promotions_current_uses_lte_max_uses' and conrelid = 'public.promotions'::regclass
  ) then
    alter table public.promotions add constraint promotions_current_uses_lte_max_uses check (current_uses <= max_uses);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'promotions_valid_window' and conrelid = 'public.promotions'::regclass
  ) then
    alter table public.promotions add constraint promotions_valid_window check (valid_until >= valid_from);
  end if;
end $$;

create or replace function public.promotions_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists promotions_set_updated_at on public.promotions;
create trigger promotions_set_updated_at
  before update on public.promotions
  for each row
  execute procedure public.promotions_set_updated_at();

alter table public.promotions enable row level security;

drop policy if exists "promotions_select_public" on public.promotions;
create policy "promotions_select_public"
  on public.promotions
  for select
  to anon, authenticated
  using (true);

create table if not exists public.ad_applications (
  id text primary key,
  vendor_id text not null,
  scope text not null,
  product_id text,
  product_name text,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_applications_scope_valid check (scope in ('single', 'all')),
  constraint ad_applications_status_valid check (status in ('pending', 'approved', 'rejected')),
  constraint ad_applications_single_requires_product check (
    (scope = 'single' and product_id is not null) or (scope = 'all')
  )
);

create index if not exists ad_applications_vendor_id_idx on public.ad_applications (vendor_id);
create index if not exists ad_applications_status_idx on public.ad_applications (status);
create index if not exists ad_applications_created_at_idx on public.ad_applications (created_at desc);

create or replace function public.ad_applications_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ad_applications_set_updated_at on public.ad_applications;
create trigger ad_applications_set_updated_at
  before update on public.ad_applications
  for each row
  execute procedure public.ad_applications_set_updated_at();

alter table public.ad_applications enable row level security;

drop policy if exists "ad_applications_select_public" on public.ad_applications;
create policy "ad_applications_select_public"
  on public.ad_applications
  for select
  to anon, authenticated
  using (true);

comment on table public.promotions is 'Discount campaigns and promo codes.';
comment on table public.ad_applications is 'Vendor requests for product or all-product ad placements.';

insert into public.promotions (
  id, code, description, discount_type, discount_value, max_uses, current_uses, valid_from, valid_until, active
)
values
  ('1', 'SAVE10', '10% off all products', 'percentage', 10, 100, 45, '2024-03-01T00:00:00Z', '2024-03-31T00:00:00Z', true),
  ('2', 'FLAT20', '$20 off orders over $100', 'fixed', 20, 50, 28, '2024-03-01T00:00:00Z', '2024-03-31T00:00:00Z', true)
on conflict (id) do nothing;
