-- Product order materialization from paid checkout sessions.
-- Converts checkout data into immutable order records for fulfillment/reporting.

-- 1) Product orders.
create table if not exists public.product_orders (
  id text primary key,
  checkout_id text references public.checkout_sessions(id) on delete set null,
  customer_id text not null references public.customers(id) on delete cascade,
  status text not null default 'pending_fulfillment',
  currency text not null default 'UGX',
  subtotal_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  platform_fee_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  payment_provider text not null default 'paytota',
  payment_reference text,
  delivery_address text,
  notes text,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_orders_customer_id_idx
  on public.product_orders (customer_id, created_at desc);
create index if not exists product_orders_status_idx
  on public.product_orders (status);
create index if not exists product_orders_checkout_id_idx
  on public.product_orders (checkout_id);
create unique index if not exists product_orders_checkout_id_key
  on public.product_orders (checkout_id)
  where checkout_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_orders_status_valid' and conrelid = 'public.product_orders'::regclass
  ) then
    alter table public.product_orders add constraint product_orders_status_valid check (
      status in ('pending_fulfillment', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_orders_currency_valid' and conrelid = 'public.product_orders'::regclass
  ) then
    alter table public.product_orders add constraint product_orders_currency_valid check (currency in ('UGX'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_orders_amounts_nonnegative' and conrelid = 'public.product_orders'::regclass
  ) then
    alter table public.product_orders add constraint product_orders_amounts_nonnegative check (
      subtotal_amount >= 0
      and discount_amount >= 0
      and platform_fee_amount >= 0
      and tax_amount >= 0
      and total_amount >= 0
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_orders_provider_valid' and conrelid = 'public.product_orders'::regclass
  ) then
    alter table public.product_orders add constraint product_orders_provider_valid check (
      payment_provider in ('paytota')
    );
  end if;
end $$;

-- 2) Product order items.
create table if not exists public.product_order_items (
  id text primary key,
  order_id text not null references public.product_orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  vendor_id text references public.vendors(id) on delete set null,
  product_name_snapshot text not null default '',
  category_snapshot text not null default '',
  quantity integer not null default 1,
  unit_amount numeric(12, 2) not null default 0,
  line_total_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_order_items_order_id_idx
  on public.product_order_items (order_id);
create index if not exists product_order_items_product_id_idx
  on public.product_order_items (product_id);
create index if not exists product_order_items_vendor_id_idx
  on public.product_order_items (vendor_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_order_items_quantity_positive' and conrelid = 'public.product_order_items'::regclass
  ) then
    alter table public.product_order_items add constraint product_order_items_quantity_positive check (quantity > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_order_items_amounts_nonnegative' and conrelid = 'public.product_order_items'::regclass
  ) then
    alter table public.product_order_items add constraint product_order_items_amounts_nonnegative check (
      unit_amount >= 0 and line_total_amount >= 0
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_order_items_name_not_blank' and conrelid = 'public.product_order_items'::regclass
  ) then
    alter table public.product_order_items add constraint product_order_items_name_not_blank check (
      length(trim(product_name_snapshot)) > 0
    );
  end if;
end $$;

-- 3) Vendor settlements from product orders (admin disbursement source).
create table if not exists public.product_vendor_settlements (
  id text primary key,
  order_id text not null references public.product_orders(id) on delete cascade,
  vendor_id text not null references public.vendors(id) on delete cascade,
  gross_amount numeric(12, 2) not null default 0,
  fee_amount numeric(12, 2) not null default 0,
  net_amount numeric(12, 2) not null default 0,
  status text not null default 'pending',
  admin_disbursement_id text references public.admin_disbursements(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_vendor_settlements_order_id_idx
  on public.product_vendor_settlements (order_id);
create index if not exists product_vendor_settlements_vendor_id_idx
  on public.product_vendor_settlements (vendor_id);
create index if not exists product_vendor_settlements_status_idx
  on public.product_vendor_settlements (status);
create unique index if not exists product_vendor_settlements_order_vendor_key
  on public.product_vendor_settlements (order_id, vendor_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_vendor_settlements_status_valid' and conrelid = 'public.product_vendor_settlements'::regclass
  ) then
    alter table public.product_vendor_settlements add constraint product_vendor_settlements_status_valid check (
      status in ('pending', 'processing', 'paid', 'failed', 'reversed')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_vendor_settlements_amounts_nonnegative' and conrelid = 'public.product_vendor_settlements'::regclass
  ) then
    alter table public.product_vendor_settlements add constraint product_vendor_settlements_amounts_nonnegative check (
      gross_amount >= 0 and fee_amount >= 0 and net_amount >= 0 and net_amount <= gross_amount
    );
  end if;
end $$;

-- 4) updated_at triggers.
create or replace function public.product_orders_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_orders_set_updated_at on public.product_orders;
create trigger product_orders_set_updated_at
  before update on public.product_orders
  for each row
  execute procedure public.product_orders_set_updated_at();

create or replace function public.product_vendor_settlements_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_vendor_settlements_set_updated_at on public.product_vendor_settlements;
create trigger product_vendor_settlements_set_updated_at
  before update on public.product_vendor_settlements
  for each row
  execute procedure public.product_vendor_settlements_set_updated_at();

-- 5) Materialize paid product checkout into order + items + settlements.
create or replace function public.materialize_paid_product_checkout(
  p_order_id text,
  p_checkout_id text,
  p_delivery_address text default null,
  p_notes text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cs public.checkout_sessions%rowtype;
begin
  if p_order_id is null or length(trim(p_order_id)) = 0 then
    raise exception 'order id is required';
  end if;

  if p_checkout_id is null or length(trim(p_checkout_id)) = 0 then
    raise exception 'checkout id is required';
  end if;

  if exists (select 1 from public.product_orders po where po.checkout_id = p_checkout_id) then
    raise exception 'checkout already materialized into product order: %', p_checkout_id;
  end if;

  select *
  into cs
  from public.checkout_sessions c
  where c.id = p_checkout_id;

  if not found then
    raise exception 'checkout not found: %', p_checkout_id;
  end if;

  if cs.checkout_type <> 'product' then
    raise exception 'checkout % is not a product checkout', p_checkout_id;
  end if;

  if cs.status <> 'paid' then
    raise exception 'checkout % must be paid before order materialization', p_checkout_id;
  end if;

  if not exists (
    select 1
    from public.checkout_line_items cli
    where cli.checkout_id = p_checkout_id
      and cli.line_type = 'product'
  ) then
    raise exception 'checkout % has no product line items', p_checkout_id;
  end if;

  insert into public.product_orders (
    id,
    checkout_id,
    customer_id,
    status,
    currency,
    subtotal_amount,
    discount_amount,
    platform_fee_amount,
    tax_amount,
    total_amount,
    payment_provider,
    payment_reference,
    delivery_address,
    notes,
    paid_at
  )
  values (
    p_order_id,
    cs.id,
    cs.customer_id,
    'pending_fulfillment',
    cs.currency,
    cs.subtotal_amount,
    cs.discount_amount,
    cs.platform_fee_amount,
    cs.tax_amount,
    cs.total_amount,
    cs.payment_provider,
    cs.payment_reference,
    p_delivery_address,
    p_notes,
    coalesce(cs.paid_at, now())
  );

  insert into public.product_order_items (
    id,
    order_id,
    product_id,
    vendor_id,
    product_name_snapshot,
    category_snapshot,
    quantity,
    unit_amount,
    line_total_amount
  )
  select
    concat('poi-', cli.id),
    p_order_id,
    cli.product_id,
    cli.vendor_id,
    coalesce(p.name, cli.title),
    coalesce(p.category, ''),
    cli.quantity,
    cli.unit_amount,
    cli.line_total_amount
  from public.checkout_line_items cli
  left join public.products p on p.id = cli.product_id
  where cli.checkout_id = p_checkout_id
    and cli.line_type = 'product';

  insert into public.product_vendor_settlements (
    id,
    order_id,
    vendor_id,
    gross_amount,
    fee_amount,
    net_amount,
    status
  )
  select
    concat('pvs-', p_order_id, '-', x.vendor_id),
    p_order_id,
    x.vendor_id,
    x.gross_amount,
    0,
    x.gross_amount,
    'pending'
  from (
    select
      poi.vendor_id,
      sum(poi.line_total_amount)::numeric(12, 2) as gross_amount
    from public.product_order_items poi
    where poi.order_id = p_order_id
      and poi.vendor_id is not null
    group by poi.vendor_id
  ) x;

  update public.checkout_sessions cs2
  set status = 'fulfilled'
  where cs2.id = p_checkout_id
    and cs2.status = 'paid';

  update public.customers c
  set
    total_orders = coalesce(c.total_orders, 0) + 1,
    total_spent = (coalesce(c.total_spent, 0) + coalesce(cs.total_amount, 0))::numeric(12, 2)
  where c.id = cs.customer_id;

  return p_order_id;
end;
$$;

-- 6) Create admin disbursement items for product settlements.
create or replace function public.create_admin_disbursements_for_product_order(
  p_order_id text,
  p_fee_percent numeric default 0,
  p_initiated_by text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  created_count integer := 0;
  fee_percent numeric(8, 4);
  v_fee_amount numeric(12, 2);
  v_net_amount numeric(12, 2);
  payout_account_id text;
  disbursement_id text;
begin
  if p_order_id is null or length(trim(p_order_id)) = 0 then
    raise exception 'order id is required';
  end if;

  fee_percent := greatest(0, coalesce(p_fee_percent, 0));

  for rec in
    select pvs.*
    from public.product_vendor_settlements pvs
    where pvs.order_id = p_order_id
      and pvs.admin_disbursement_id is null
  loop
    v_fee_amount := round((rec.gross_amount * fee_percent) / 100.0, 2);
    v_net_amount := greatest(0, rec.gross_amount - v_fee_amount);

    select vpa.id
    into payout_account_id
    from public.vendor_payout_accounts vpa
    where vpa.vendor_id = rec.vendor_id
      and vpa.is_default = true
    order by vpa.created_at desc
    limit 1;

    disbursement_id := concat('ad-prod-', rec.id);

    insert into public.admin_disbursements (
      id,
      vendor_id,
      payout_account_id,
      source_type,
      source_reference,
      currency,
      gross_amount,
      fee_amount,
      net_amount,
      status,
      initiated_by,
      metadata
    )
    values (
      disbursement_id,
      rec.vendor_id,
      payout_account_id,
      'product_checkout',
      rec.order_id,
      'UGX',
      rec.gross_amount,
      v_fee_amount,
      v_net_amount,
      'pending_approval',
      p_initiated_by,
      jsonb_build_object(
        'origin', 'create_admin_disbursements_for_product_order',
        'product_settlement_id', rec.id
      )
    )
    on conflict (id) do nothing;

    update public.product_vendor_settlements pvs
    set
      fee_amount = v_fee_amount,
      net_amount = v_net_amount,
      admin_disbursement_id = disbursement_id,
      status = 'processing'
    where pvs.id = rec.id;

    created_count := created_count + 1;
  end loop;

  return created_count;
end;
$$;

-- 7) RLS baseline.
alter table public.product_orders enable row level security;
alter table public.product_order_items enable row level security;
alter table public.product_vendor_settlements enable row level security;

create policy "product_orders_select_customer_or_admin"
  on public.product_orders
  for select
  to authenticated
  using (
    public.is_admin_user()
    or customer_id = public.current_app_user_id()
  );

create policy "product_orders_write_admin_only"
  on public.product_orders
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "product_order_items_select_order_scope"
  on public.product_order_items
  for select
  to authenticated
  using (
    public.is_admin_user()
    or exists (
      select 1
      from public.product_orders po
      where po.id = product_order_items.order_id
        and po.customer_id = public.current_app_user_id()
    )
  );

create policy "product_order_items_write_admin_only"
  on public.product_order_items
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "product_vendor_settlements_select_vendor_or_admin"
  on public.product_vendor_settlements
  for select
  to authenticated
  using (
    public.is_admin_user()
    or vendor_id = public.current_app_user_id()
  );

create policy "product_vendor_settlements_write_admin_only"
  on public.product_vendor_settlements
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

comment on table public.product_orders is 'Materialized product orders created from paid product checkouts.';
comment on table public.product_order_items is 'Immutable order line snapshots for product orders.';
comment on table public.product_vendor_settlements is 'Per-vendor settlement rows for product-order disbursement.';
comment on function public.materialize_paid_product_checkout(text, text, text, text) is 'Creates product order + items + settlements from a paid product checkout.';
comment on function public.create_admin_disbursements_for_product_order(text, numeric, text) is 'Creates admin disbursement queue rows from product vendor settlements.';
