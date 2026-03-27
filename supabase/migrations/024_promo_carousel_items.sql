-- Promo carousel items: product + uploaded banner image.

create table if not exists public.promo_carousel_items (
  id text primary key,
  product_id text not null,
  banner_url text not null,
  source text not null default 'admin',
  ad_application_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_carousel_items_source_valid check (source in ('admin', 'vendor_application'))
);

create index if not exists promo_carousel_items_active_idx
  on public.promo_carousel_items (active) where active = true;

create index if not exists promo_carousel_items_product_id_idx
  on public.promo_carousel_items (product_id);

create unique index if not exists promo_carousel_items_product_active_unique
  on public.promo_carousel_items (product_id)
  where active = true;

create or replace function public.promo_carousel_items_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists promo_carousel_items_set_updated_at on public.promo_carousel_items;
create trigger promo_carousel_items_set_updated_at
  before update on public.promo_carousel_items
  for each row
  execute procedure public.promo_carousel_items_set_updated_at();

alter table public.promo_carousel_items enable row level security;

drop policy if exists "promo_carousel_items_select_public" on public.promo_carousel_items;
create policy "promo_carousel_items_select_public"
  on public.promo_carousel_items
  for select
  to anon, authenticated
  using (true);

