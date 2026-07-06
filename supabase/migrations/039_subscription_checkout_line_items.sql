-- Allow subscription line items on checkout sessions.

-- Normalize unexpected line_type values before re-validating constraints.
update public.checkout_line_items cli
set line_type = case
  when trim(lower(cli.line_type)) in ('product', 'service', 'subscription') then trim(lower(cli.line_type))
  when cs.checkout_type = 'subscription' then 'subscription'
  when cli.service_request_id is not null then 'service'
  else 'product'
end
from public.checkout_sessions cs
where cli.checkout_id = cs.id
  and (
    cli.line_type is null
    or trim(cli.line_type) = ''
    or trim(lower(cli.line_type)) not in ('product', 'service', 'subscription')
  );

update public.checkout_line_items
set line_type = case
  when trim(lower(line_type)) in ('product', 'service', 'subscription') then trim(lower(line_type))
  when service_request_id is not null then 'service'
  when coalesce(metadata->>'plan_tier', metadata->>'subscription_plan', '') <> '' then 'subscription'
  else 'product'
end
where line_type is null
   or trim(line_type) = ''
   or trim(lower(line_type)) not in ('product', 'service', 'subscription');

alter table public.checkout_line_items drop constraint if exists checkout_line_items_line_type_valid;

alter table public.checkout_line_items
  add constraint checkout_line_items_line_type_valid check (
    line_type in ('product', 'service', 'subscription')
  );

-- Migration 020 uses this name (not checkout_line_items_type_refs_valid).
alter table public.checkout_line_items drop constraint if exists checkout_line_items_product_or_service_required;
alter table public.checkout_line_items drop constraint if exists checkout_line_items_type_refs_valid;

alter table public.checkout_line_items
  add constraint checkout_line_items_product_or_service_required check (
    (line_type = 'product' and service_request_id is null)
    or (line_type = 'service' and service_request_id is not null and product_id is null)
    or (line_type = 'subscription' and product_id is null and service_request_id is null)
  );

create or replace function public.upsert_checkout_line_item(
  p_line_item_id text,
  p_checkout_id text,
  p_line_type text,
  p_title text,
  p_quantity integer,
  p_unit_amount numeric,
  p_product_id text default null,
  p_service_request_id text default null,
  p_vendor_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  checkout_row public.checkout_sessions%rowtype;
  line_total numeric(12, 2);
begin
  if p_line_item_id is null or length(trim(p_line_item_id)) = 0 then
    raise exception 'line item id is required';
  end if;

  if p_checkout_id is null or length(trim(p_checkout_id)) = 0 then
    raise exception 'checkout id is required';
  end if;

  if p_line_type not in ('product', 'service', 'subscription') then
    raise exception 'line type must be product, service, or subscription';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'quantity must be at least 1';
  end if;

  if p_unit_amount is null or p_unit_amount < 0 then
    raise exception 'unit amount must be nonnegative';
  end if;

  if p_line_type = 'product' and p_service_request_id is not null then
    raise exception 'product line must not have service_request_id';
  end if;

  if p_line_type = 'service' and (p_service_request_id is null or p_product_id is not null) then
    raise exception 'service line must have service_request_id and no product_id';
  end if;

  if p_line_type = 'subscription' and (p_product_id is not null or p_service_request_id is not null) then
    raise exception 'subscription line must not have product_id or service_request_id';
  end if;

  if jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'metadata must be a json object';
  end if;

  select *
  into checkout_row
  from public.checkout_sessions cs
  where cs.id = p_checkout_id;

  if not found then
    raise exception 'checkout not found: %', p_checkout_id;
  end if;

  if checkout_row.status not in ('draft', 'review') then
    raise exception 'checkout % is not editable in status %', p_checkout_id, checkout_row.status;
  end if;

  line_total := (p_quantity::numeric * p_unit_amount)::numeric(12, 2);

  insert into public.checkout_line_items (
    id,
    checkout_id,
    line_type,
    product_id,
    service_request_id,
    vendor_id,
    title,
    quantity,
    unit_amount,
    line_total_amount,
    metadata
  )
  values (
    p_line_item_id,
    p_checkout_id,
    p_line_type,
    p_product_id,
    p_service_request_id,
    p_vendor_id,
    p_title,
    p_quantity,
    p_unit_amount,
    line_total,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (id) do update set
    line_type = excluded.line_type,
    product_id = excluded.product_id,
    service_request_id = excluded.service_request_id,
    vendor_id = excluded.vendor_id,
    title = excluded.title,
    quantity = excluded.quantity,
    unit_amount = excluded.unit_amount,
    line_total_amount = excluded.line_total_amount,
    metadata = excluded.metadata;

  return p_line_item_id;
end;
$$;
