-- Named variant axes (e.g. Volume, Grade) and their values; pairs with products.variants[].selections.

alter table public.products add column if not exists variant_options jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_variant_options_is_array'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_variant_options_is_array check (jsonb_typeof(variant_options) = 'array');
  end if;
end $$;

comment on column public.products.variant_options is
  'Array of { id, name, values: [{ id, label }] }; shoppers pick one value per axis; SKUs use variants[].selections.';
