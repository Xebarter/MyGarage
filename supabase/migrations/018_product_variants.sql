-- Sellable options per product (e.g. size, volume). Stored as JSON array of { id, label, price, stock }.

alter table public.products add column if not exists variants jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_variants_is_array'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_variants_is_array check (jsonb_typeof(variants) = 'array');
  end if;
end $$;

comment on column public.products.variants is 'Array of { id, label, price, stock } for buyer-selectable options; empty [] means single SKU at product.price / product.stock.';
