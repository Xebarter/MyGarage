-- Allow product deletes to nullify checkout_line_items.product_id while preserving historical line item snapshots.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'checkout_line_items_product_or_service_required'
      and conrelid = 'public.checkout_line_items'::regclass
  ) then
    alter table public.checkout_line_items
      drop constraint checkout_line_items_product_or_service_required;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'checkout_line_items_product_or_service_required'
      and conrelid = 'public.checkout_line_items'::regclass
  ) then
    alter table public.checkout_line_items
      add constraint checkout_line_items_product_or_service_required check (
        (line_type = 'product' and service_request_id is null)
        or (line_type = 'service' and service_request_id is not null and product_id is null)
      );
  end if;
end $$;
