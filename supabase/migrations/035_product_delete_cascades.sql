-- Hard-delete products should remove dependent rows that previously had no FK cascade.

delete from public.promo_carousel_items pci
where pci.product_id is not null
  and not exists (select 1 from public.products p where p.id = pci.product_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'promo_carousel_items_product_id_fkey'
      and conrelid = 'public.promo_carousel_items'::regclass
  ) then
    alter table public.promo_carousel_items
      add constraint promo_carousel_items_product_id_fkey
      foreign key (product_id) references public.products(id) on delete cascade;
  end if;
end $$;

delete from public.ad_applications aa
where aa.product_id is not null
  and not exists (select 1 from public.products p where p.id = aa.product_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ad_applications_product_id_fkey'
      and conrelid = 'public.ad_applications'::regclass
  ) then
    alter table public.ad_applications
      add constraint ad_applications_product_id_fkey
      foreign key (product_id) references public.products(id) on delete cascade;
  end if;
end $$;
