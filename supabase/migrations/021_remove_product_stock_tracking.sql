-- Disable stock reservation/commit flows and stock-based refund restocks.

drop trigger if exists checkout_inventory_status_orchestrator on public.checkout_sessions;
drop function if exists public.on_checkout_inventory_status_change();
drop function if exists public.reserve_inventory_for_checkout(text, integer);
drop function if exists public.release_inventory_for_checkout(text, text);
drop function if exists public.commit_inventory_for_checkout(text);
drop function if exists public.expire_stale_inventory_reservations();

drop trigger if exists product_inventory_reservations_set_updated_at on public.product_inventory_reservations;
drop function if exists public.product_inventory_reservations_set_updated_at();
drop table if exists public.product_inventory_reservations cascade;

create or replace function public.apply_successful_refund_effects(
  p_refund_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  rr public.refund_requests%rowtype;
begin
  if p_refund_id is null or length(trim(p_refund_id)) = 0 then
    raise exception 'refund id is required';
  end if;

  select *
  into rr
  from public.refund_requests r
  where r.id = p_refund_id;

  if not found then
    raise exception 'refund request not found: %', p_refund_id;
  end if;

  if rr.status <> 'succeeded' then
    raise exception 'refund % must be succeeded before applying side-effects', p_refund_id;
  end if;

  if rr.refund_type = 'product' then
    if rr.checkout_id is not null then
      update public.checkout_sessions cs
      set status = 'cancelled'
      where cs.id = rr.checkout_id
        and cs.status in ('paid', 'fulfilled');
    end if;

    if rr.product_order_id is not null then
      update public.product_orders po
      set
        status = 'refunded',
        cancelled_at = coalesce(po.cancelled_at, now())
      where po.id = rr.product_order_id
        and po.status in ('pending_fulfillment', 'processing', 'shipped', 'delivered');

      update public.product_vendor_settlements pvs
      set status = 'reversed'
      where pvs.order_id = rr.product_order_id
        and pvs.status in ('pending', 'processing');

      update public.admin_disbursements ad
      set status = 'reversed'
      where ad.source_type = 'product_checkout'
        and ad.source_reference = rr.product_order_id
        and ad.status in ('pending_approval', 'approved', 'processing');
    end if;
  end if;

  if rr.refund_type = 'service' and rr.service_payment_id is not null then
    update public.service_payments sp
    set status = 'refunded'
    where sp.id = rr.service_payment_id
      and sp.status in ('captured', 'authorized');

    update public.service_provider_payouts spp
    set status = 'reversed'
    where spp.payment_id = rr.service_payment_id
      and spp.status in ('pending', 'processing');

    update public.admin_disbursements ad
    set status = 'reversed'
    where ad.service_payment_id = rr.service_payment_id
      and ad.status in ('pending_approval', 'approved', 'processing');
  end if;

  return p_refund_id;
end;
$$;
