-- Link Paytota payout transactions to admin_disbursements safely.

alter table public.paytota_transactions
  add column if not exists admin_disbursement_id text references public.admin_disbursements(id) on delete set null;

create index if not exists paytota_transactions_admin_disbursement_id_idx
  on public.paytota_transactions (admin_disbursement_id);

-- Extend webhook finalizer to update admin_disbursements when we logged payouts against admin_disbursement_id
-- (instead of service_provider_payouts).
create or replace function public.on_paytota_webhook_finalize_checkout(
  p_provider_reference text,
  p_provider_status text,
  p_payload jsonb default '{}'::jsonb,
  p_transaction_id text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  tx_row public.paytota_transactions%rowtype;
  normalized_status text;
begin
  if p_provider_status is null or length(trim(p_provider_status)) = 0 then
    raise exception 'provider status is required';
  end if;

  if p_provider_reference is null and p_transaction_id is null then
    raise exception 'provider reference or transaction id is required';
  end if;

  normalized_status := case lower(trim(p_provider_status))
    when 'success' then 'succeeded'
    when 'succeeded' then 'succeeded'
    when 'paid' then 'succeeded'
    when 'completed' then 'succeeded'
    when 'processing' then 'processing'
    when 'pending' then 'processing'
    when 'cancelled' then 'cancelled'
    when 'canceled' then 'cancelled'
    when 'failed' then 'failed'
    when 'error' then 'failed'
    else 'processing'
  end;

  select *
  into tx_row
  from public.paytota_transactions pt
  where (p_transaction_id is not null and pt.id = p_transaction_id)
     or (p_provider_reference is not null and pt.provider_reference = p_provider_reference)
  order by pt.created_at desc
  limit 1;

  if not found then
    raise exception 'paytota transaction not found for ref/id';
  end if;

  update public.paytota_transactions pt
  set
    provider_reference = coalesce(p_provider_reference, pt.provider_reference),
    provider_status = p_provider_status,
    status = normalized_status,
    webhook_payload = case
      when jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) = 'object' then coalesce(p_payload, '{}'::jsonb)
      else '{}'::jsonb
    end,
    processed_at = now()
  where pt.id = tx_row.id;

  -- Checkout flow finalization.
  if tx_row.checkout_id is not null then
    if normalized_status = 'succeeded' then
      update public.checkout_sessions cs
      set
        status = case when cs.status in ('payment_pending', 'failed') then 'paid' else cs.status end,
        payment_reference = coalesce(p_provider_reference, cs.payment_reference),
        paid_at = coalesce(cs.paid_at, now())
      where cs.id = tx_row.checkout_id;
    elsif normalized_status in ('failed', 'cancelled') then
      update public.checkout_sessions cs
      set
        status = case
          when normalized_status = 'failed' then 'failed'
          when normalized_status = 'cancelled' then 'cancelled'
          else cs.status
        end,
        payment_reference = coalesce(p_provider_reference, cs.payment_reference)
      where cs.id = tx_row.checkout_id
        and cs.status in ('payment_pending', 'failed');
    else
      update public.checkout_sessions cs
      set payment_reference = coalesce(p_provider_reference, cs.payment_reference)
      where cs.id = tx_row.checkout_id;
    end if;
  end if;

  -- Service payment finalization.
  if tx_row.service_payment_id is not null then
    if normalized_status = 'succeeded' then
      update public.service_payments sp
      set
        status = 'captured',
        payment_provider = 'paytota',
        provider_reference = coalesce(p_provider_reference, sp.provider_reference),
        paid_at = coalesce(sp.paid_at, now())
      where sp.id = tx_row.service_payment_id;
    elsif normalized_status in ('failed', 'cancelled') then
      update public.service_payments sp
      set
        status = case
          when normalized_status = 'failed' then 'failed'
          else 'cancelled'
        end,
        payment_provider = 'paytota',
        provider_reference = coalesce(p_provider_reference, sp.provider_reference)
      where sp.id = tx_row.service_payment_id;
    end if;
  end if;

  -- Service payout ledger updates (service_provider_payouts).
  if tx_row.provider_payout_id is not null then
    if normalized_status = 'succeeded' then
      update public.service_provider_payouts spp
      set
        status = 'paid',
        payout_reference = coalesce(p_provider_reference, spp.payout_reference),
        paid_out_at = coalesce(spp.paid_out_at, now())
      where spp.id = tx_row.provider_payout_id;

      update public.admin_disbursements ad
      set
        status = 'paid',
        payout_reference = coalesce(p_provider_reference, ad.payout_reference),
        paid_out_at = coalesce(ad.paid_out_at, now())
      where ad.service_provider_payout_id = tx_row.provider_payout_id
        and ad.status in ('approved', 'processing');
    elsif normalized_status in ('failed', 'cancelled') then
      update public.service_provider_payouts spp
      set
        status = 'failed',
        payout_reference = coalesce(p_provider_reference, spp.payout_reference)
      where spp.id = tx_row.provider_payout_id;

      update public.admin_disbursements ad
      set
        status = 'failed',
        payout_reference = coalesce(p_provider_reference, ad.payout_reference),
        failed_at = coalesce(ad.failed_at, now())
      where ad.service_provider_payout_id = tx_row.provider_payout_id
        and ad.status in ('approved', 'processing');
    end if;
  end if;

  -- Admin disbursement updates (product checkout payouts and any payout logged directly against admin_disbursement_id).
  if tx_row.admin_disbursement_id is not null then
    if normalized_status = 'succeeded' then
      update public.admin_disbursements ad
      set
        status = 'paid',
        payout_reference = coalesce(p_provider_reference, ad.payout_reference),
        paid_out_at = coalesce(ad.paid_out_at, now())
      where ad.id = tx_row.admin_disbursement_id
        and ad.status in ('approved', 'processing');
    elsif normalized_status in ('failed', 'cancelled') then
      update public.admin_disbursements ad
      set
        status = 'failed',
        payout_reference = coalesce(p_provider_reference, ad.payout_reference),
        failed_at = coalesce(ad.failed_at, now())
      where ad.id = tx_row.admin_disbursement_id
        and ad.status in ('approved', 'processing');
    end if;
  end if;

  return tx_row.id;
end;
$$;

