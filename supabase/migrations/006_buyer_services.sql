-- Buyer services entities for MyGarage.
-- Persists buyer service requests and buyer ratings for service providers.

create table if not exists public.buyer_service_requests (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  category text not null default '',
  service text not null default '',
  location text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_service_requests_customer_id_idx on public.buyer_service_requests (customer_id);
create index if not exists buyer_service_requests_status_idx on public.buyer_service_requests (status);
create index if not exists buyer_service_requests_created_at_idx on public.buyer_service_requests (created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_service_requests_category_not_blank' and conrelid = 'public.buyer_service_requests'::regclass
  ) then
    alter table public.buyer_service_requests add constraint buyer_service_requests_category_not_blank check (length(trim(category)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_service_requests_service_not_blank' and conrelid = 'public.buyer_service_requests'::regclass
  ) then
    alter table public.buyer_service_requests add constraint buyer_service_requests_service_not_blank check (length(trim(service)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_service_requests_location_not_blank' and conrelid = 'public.buyer_service_requests'::regclass
  ) then
    alter table public.buyer_service_requests add constraint buyer_service_requests_location_not_blank check (length(trim(location)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_service_requests_status_valid' and conrelid = 'public.buyer_service_requests'::regclass
  ) then
    alter table public.buyer_service_requests add constraint buyer_service_requests_status_valid check (
      status in ('pending', 'matched', 'in_progress', 'completed')
    );
  end if;
end $$;

create or replace function public.buyer_service_requests_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists buyer_service_requests_set_updated_at on public.buyer_service_requests;
create trigger buyer_service_requests_set_updated_at
  before update on public.buyer_service_requests
  for each row
  execute procedure public.buyer_service_requests_set_updated_at();

alter table public.buyer_service_requests enable row level security;

drop policy if exists "buyer_service_requests_select_public" on public.buyer_service_requests;
create policy "buyer_service_requests_select_public"
  on public.buyer_service_requests
  for select
  to anon, authenticated
  using (true);

create table if not exists public.buyer_provider_ratings (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  provider_id text not null,
  stars integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists buyer_provider_ratings_customer_provider_key
  on public.buyer_provider_ratings (customer_id, provider_id);
create index if not exists buyer_provider_ratings_customer_id_idx on public.buyer_provider_ratings (customer_id);
create index if not exists buyer_provider_ratings_provider_id_idx on public.buyer_provider_ratings (provider_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_provider_ratings_provider_id_not_blank' and conrelid = 'public.buyer_provider_ratings'::regclass
  ) then
    alter table public.buyer_provider_ratings add constraint buyer_provider_ratings_provider_id_not_blank check (length(trim(provider_id)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buyer_provider_ratings_stars_range' and conrelid = 'public.buyer_provider_ratings'::regclass
  ) then
    alter table public.buyer_provider_ratings add constraint buyer_provider_ratings_stars_range check (stars between 1 and 5);
  end if;
end $$;

create or replace function public.buyer_provider_ratings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists buyer_provider_ratings_set_updated_at on public.buyer_provider_ratings;
create trigger buyer_provider_ratings_set_updated_at
  before update on public.buyer_provider_ratings
  for each row
  execute procedure public.buyer_provider_ratings_set_updated_at();

alter table public.buyer_provider_ratings enable row level security;

drop policy if exists "buyer_provider_ratings_select_public" on public.buyer_provider_ratings;
create policy "buyer_provider_ratings_select_public"
  on public.buyer_provider_ratings
  for select
  to anon, authenticated
  using (true);

comment on table public.buyer_service_requests is 'Buyer requests for service operations (towing, repairs, detailing, etc.).';
comment on table public.buyer_provider_ratings is 'Buyer star ratings for service providers.';
