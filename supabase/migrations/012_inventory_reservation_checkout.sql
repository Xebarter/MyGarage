-- Inventory reservation/commit/release workflow for product checkouts.
-- Prevents overselling while keeping checkout responsive.

-- 1) Reservation ledger for auditability and reconciliation.
create table if not exists public.product_inventory_reservations (
  id text primary key,
  checkout_id text not null references public.checkout_sessions(id) on delete cascade,
  line_item_id text references public.checkout_line_items(id) on delete set null,
  product_id text not null references public.products(id) on delete cascade,
  quantity integer not null default 1,
  status text not null default 'reserved',
  reserved_at timestamptz not null default now(),
  released_at timestamptz,
  committed_at timestamptz,
  expires_at timestamptz,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_inventory_reservations_checkout_id_idx
  on public.product_inventory_reservations (checkout_id);
create index if not exists product_inventory_reservations_product_id_idx
  on public.product_inventory_reservations (product_id);
create index if not exists product_inventory_reservations_status_idx
  on public.product_inventory_reservations (status);
create unique index if not exists product_inventory_reservations_checkout_line_unique
  on public.product_inventory_reservations (checkout_id, line_item_id)
  where line_item_id is not null and status = 'reserved';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_inventory_reservations_quantity_positive' and conrelid = 'public.product_inventory_reservations'::regclass
  ) then
    alter table public.product_inventory_reservations add constraint product_inventory_reservations_quantity_positive check (quantity > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_inventory_reservations_status_valid' and conrelid = 'public.product_inventory_reservations'::regclass
  ) then
    alter table public.product_inventory_reservations add constraint product_inventory_reservations_status_valid check (
      status in ('reserved', 'released', 'committed', 'expired')
    );
  end if;
end $$;

-- 2) updated_at trigger.
create or replace function public.product_inventory_reservations_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_inventory_reservations_set_updated_at on public.product_inventory_reservations;
create trigger product_inventory_reservations_set_updated_at
  before update on public.product_inventory_reservations
  for each row
  execute procedure public.product_inventory_reservations_set_updated_at();

-- 3) Reserve stock for editable/ready checkout.
create or replace function public.reserve_inventory_for_checkout(
  p_checkout_id text,
  p_ttl_minutes integer default 30
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cs public.checkout_sessions%rowtype;
  rec record;
  available_qty integer;
  existing_reserved integer;
  reserve_qty integer;
  expires_at_value timestamptz;
  reservations_created integer := 0;
begin
  if p_checkout_id is null or length(trim(p_checkout_id)) = 0 then
    raise exception 'checkout id is required';
  end if;

  if p_ttl_minutes is null or p_ttl_minutes < 1 then
    p_ttl_minutes := 30;
  end if;

  select *
  into cs
  from public.checkout_sessions c
  where c.id = p_checkout_id;

  if not found then
    raise exception 'checkout not found: %', p_checkout_id;
  end if;

  if cs.checkout_type <> 'product' then
    raise exception 'inventory reservation only applies to product checkouts';
  end if;

  if cs.status not in ('draft', 'review', 'payment_pending', 'failed') then
    raise exception 'checkout % not in reservable status: %', p_checkout_id, cs.status;
  end if;

  expires_at_value := now() + make_interval(mins => p_ttl_minutes);

  for rec in
    select
      cli.id as line_item_id,
      cli.product_id,
      cli.quantity
    from public.checkout_line_items cli
    where cli.checkout_id = p_checkout_id
      and cli.line_type = 'product'
      and cli.product_id is not null
  loop
    select coalesce(sum(r.quantity), 0)::integer
    into existing_reserved
    from public.product_inventory_reservations r
    where r.checkout_id = p_checkout_id
      and r.line_item_id = rec.line_item_id
      and r.status = 'reserved';

    reserve_qty := greatest(0, rec.quantity - existing_reserved);

    if reserve_qty = 0 then
      update public.product_inventory_reservations r
      set expires_at = expires_at_value
      where r.checkout_id = p_checkout_id
        and r.line_item_id = rec.line_item_id
        and r.status = 'reserved';
      continue;
    end if;

    select greatest(0, p.stock - coalesce(p.reserved_stock, 0))::integer
    into available_qty
    from public.products p
    where p.id = rec.product_id
    for update;

    if available_qty < reserve_qty then
      raise exception 'insufficient stock for product % (need %, available %)', rec.product_id, reserve_qty, available_qty;
    end if;

    update public.products p
    set reserved_stock = coalesce(p.reserved_stock, 0) + reserve_qty
    where p.id = rec.product_id;

    insert into public.product_inventory_reservations (
      id,
      checkout_id,
      line_item_id,
      product_id,
      quantity,
      status,
      reserved_at,
      expires_at,
      reason
    )
    values (
      concat('pir-', p_checkout_id, '-', rec.line_item_id, '-', extract(epoch from clock_timestamp())::bigint),
      p_checkout_id,
      rec.line_item_id,
      rec.product_id,
      reserve_qty,
      'reserved',
      now(),
      expires_at_value,
      'checkout_reservation'
    );

    reservations_created := reservations_created + 1;
  end loop;

  update public.checkout_sessions cs2
  set expires_at = coalesce(cs2.expires_at, expires_at_value)
  where cs2.id = p_checkout_id;

  return reservations_created;
end;
$$;

-- 4) Release all active reservations for a checkout.
create or replace function public.release_inventory_for_checkout(
  p_checkout_id text,
  p_reason text default 'checkout_release'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  released_count integer := 0;
begin
  if p_checkout_id is null or length(trim(p_checkout_id)) = 0 then
    raise exception 'checkout id is required';
  end if;

  for rec in
    select r.id, r.product_id, r.quantity
    from public.product_inventory_reservations r
    where r.checkout_id = p_checkout_id
      and r.status = 'reserved'
    for update
  loop
    update public.products p
    set reserved_stock = greatest(0, coalesce(p.reserved_stock, 0) - rec.quantity)
    where p.id = rec.product_id;

    update public.product_inventory_reservations r2
    set
      status = 'released',
      released_at = now(),
      reason = coalesce(p_reason, r2.reason)
    where r2.id = rec.id;

    released_count := released_count + 1;
  end loop;

  return released_count;
end;
$$;

-- 5) Commit reservations into stock deduction after successful payment.
create or replace function public.commit_inventory_for_checkout(
  p_checkout_id text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cs public.checkout_sessions%rowtype;
  rec record;
  committed_count integer := 0;
begin
  if p_checkout_id is null or length(trim(p_checkout_id)) = 0 then
    raise exception 'checkout id is required';
  end if;

  select *
  into cs
  from public.checkout_sessions c
  where c.id = p_checkout_id;

  if not found then
    raise exception 'checkout not found: %', p_checkout_id;
  end if;

  if cs.checkout_type <> 'product' then
    return 0;
  end if;

  if cs.status not in ('paid', 'fulfilled') then
    raise exception 'checkout % must be paid/fulfilled before inventory commit', p_checkout_id;
  end if;

  for rec in
    select r.id, r.product_id, r.quantity
    from public.product_inventory_reservations r
    where r.checkout_id = p_checkout_id
      and r.status = 'reserved'
    for update
  loop
    update public.products p
    set
      stock = greatest(0, p.stock - rec.quantity),
      reserved_stock = greatest(0, coalesce(p.reserved_stock, 0) - rec.quantity)
    where p.id = rec.product_id;

    update public.product_inventory_reservations r2
    set
      status = 'committed',
      committed_at = now(),
      reason = coalesce(r2.reason, 'checkout_paid')
    where r2.id = rec.id;

    committed_count := committed_count + 1;
  end loop;

  return committed_count;
end;
$$;

-- 6) Expire stale reservations in background jobs/cron.
create or replace function public.expire_stale_inventory_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  expired_count integer := 0;
begin
  for rec in
    select r.id, r.product_id, r.quantity
    from public.product_inventory_reservations r
    where r.status = 'reserved'
      and r.expires_at is not null
      and r.expires_at < now()
    for update
  loop
    update public.products p
    set reserved_stock = greatest(0, coalesce(p.reserved_stock, 0) - rec.quantity)
    where p.id = rec.product_id;

    update public.product_inventory_reservations r2
    set
      status = 'expired',
      released_at = now(),
      reason = 'reservation_expired'
    where r2.id = rec.id;

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

-- 7) Auto-orchestrate reserve/release/commit when checkout status changes.
create or replace function public.on_checkout_inventory_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.checkout_type <> 'product' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status in ('payment_pending', 'review') then
      perform public.reserve_inventory_for_checkout(new.id, 30);
    elsif new.status in ('failed', 'cancelled', 'expired') then
      perform public.release_inventory_for_checkout(new.id, concat('checkout_', new.status));
    elsif new.status in ('paid', 'fulfilled') then
      perform public.commit_inventory_for_checkout(new.id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists checkout_inventory_status_orchestrator on public.checkout_sessions;
create trigger checkout_inventory_status_orchestrator
  after update on public.checkout_sessions
  for each row
  execute procedure public.on_checkout_inventory_status_change();

-- 8) RLS.
alter table public.product_inventory_reservations enable row level security;

create policy "product_inventory_reservations_select_owner_or_admin"
  on public.product_inventory_reservations
  for select
  to authenticated
  using (
    public.is_admin_user()
    or exists (
      select 1
      from public.checkout_sessions cs
      where cs.id = product_inventory_reservations.checkout_id
        and cs.customer_id = public.current_app_user_id()
    )
  );

create policy "product_inventory_reservations_write_admin_only"
  on public.product_inventory_reservations
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

comment on table public.product_inventory_reservations is 'Reservation ledger for stock held during checkout and released/committed by lifecycle.';
comment on function public.reserve_inventory_for_checkout(text, integer) is 'Reserves stock for product checkout line items and increases products.reserved_stock.';
comment on function public.release_inventory_for_checkout(text, text) is 'Releases active reservations and decreases products.reserved_stock.';
comment on function public.commit_inventory_for_checkout(text) is 'Commits reserved stock into sold stock deduction after successful payment.';
comment on function public.expire_stale_inventory_reservations() is 'Expires reservations past TTL and reconciles reserved_stock counters.';
