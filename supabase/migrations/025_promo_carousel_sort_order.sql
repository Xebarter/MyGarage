-- Add sort_order to promo carousel items for ordering/priority.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'promo_carousel_items'
      and column_name = 'sort_order'
  ) then
    alter table public.promo_carousel_items
      add column sort_order integer not null default 0;
  end if;
end $$;

create index if not exists promo_carousel_items_sort_order_idx
  on public.promo_carousel_items (sort_order asc, updated_at desc);

