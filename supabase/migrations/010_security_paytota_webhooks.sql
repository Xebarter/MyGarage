-- Security hardening + Paytota webhook orchestration for checkout/disbursement flows.

-- 1) Auth helper functions (JWT-claim friendly).
create or replace function public.current_app_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'app_user_id', ''),
    nullif(auth.uid()::text, '')
  )
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'role') = 'admin'
    or (auth.jwt() ->> 'app_role') = 'admin',
    false
  )
$$;

-- 2) Replace permissive read policies with role-aware access.
drop policy if exists "checkout_sessions_select_public" on public.checkout_sessions;
create policy "checkout_sessions_select_owner_or_admin"
  on public.checkout_sessions
  for select
  to authenticated
  using (
    public.is_admin_user()
    or customer_id = public.current_app_user_id()
  );

create policy "checkout_sessions_insert_owner_or_admin"
  on public.checkout_sessions
  for insert
  to authenticated
  with check (
    public.is_admin_user()
    or customer_id = public.current_app_user_id()
  );

create policy "checkout_sessions_update_owner_or_admin"
  on public.checkout_sessions
  for update
  to authenticated
  using (
    public.is_admin_user()
    or customer_id = public.current_app_user_id()
  )
  with check (
    public.is_admin_user()
    or customer_id = public.current_app_user_id()
  );

drop policy if exists "checkout_line_items_select_public" on public.checkout_line_items;
create policy "checkout_line_items_select_owner_or_admin"
  on public.checkout_line_items
  for select
  to authenticated
  using (
    public.is_admin_user()
    or exists (
      select 1
      from public.checkout_sessions cs
      where cs.id = checkout_line_items.checkout_id
        and cs.customer_id = public.current_app_user_id()
    )
  );

create policy "checkout_line_items_write_owner_or_admin"
  on public.checkout_line_items
  for all
  to authenticated
  using (
    public.is_admin_user()
    or exists (
      select 1
      from public.checkout_sessions cs
      where cs.id = checkout_line_items.checkout_id
        and cs.customer_id = public.current_app_user_id()
        and cs.status in ('draft', 'review')
    )
  )
  with check (
    public.is_admin_user()
    or exists (
      select 1
      from public.checkout_sessions cs
      where cs.id = checkout_line_items.checkout_id
        and cs.customer_id = public.current_app_user_id()
        and cs.status in ('draft', 'review')
    )
  );

drop policy if exists "paytota_transactions_select_public" on public.paytota_transactions;
create policy "paytota_transactions_select_admin_only"
  on public.paytota_transactions
  for select
  to authenticated
  using (public.is_admin_user());

create policy "paytota_transactions_write_admin_only"
  on public.paytota_transactions
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "vendor_payout_accounts_select_public" on public.vendor_payout_accounts;
create policy "vendor_payout_accounts_select_vendor_or_admin"
  on public.vendor_payout_accounts
  for select
  to authenticated
  using (
    public.is_admin_user()
    or vendor_id = public.current_app_user_id()
  );

create policy "vendor_payout_accounts_write_vendor_or_admin"
  on public.vendor_payout_accounts
  for all
  to authenticated
  using (
    public.is_admin_user()
    or vendor_id = public.current_app_user_id()
  )
  with check (
    public.is_admin_user()
    or vendor_id = public.current_app_user_id()
  );

drop policy if exists "admin_disbursements_select_public" on public.admin_disbursements;
create policy "admin_disbursements_select_admin_or_vendor"
  on public.admin_disbursements
  for select
  to authenticated
  using (
    public.is_admin_user()
    or vendor_id = public.current_app_user_id()
  );

create policy "admin_disbursements_write_admin_only"
  on public.admin_disbursements
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- 3) Admin utility: transition disbursement lifecycle with guardrails.
create or replace function public.admin_set_disbursement_status(
  p_disbursement_id text,
  p_status text,
  p_actor_id text default null,
  p_rejected_reason text default null,
  p_payout_reference text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
begin
  if p_disbursement_id is null or length(trim(p_disbursement_id)) = 0 then
    raise exception 'disbursement id is required';
  end if;

  if p_status is null or length(trim(p_status)) = 0 then
    raise exception 'target status is required';
  end if;

  select ad.status
  into current_status
  from public.admin_disbursements ad
  where ad.id = p_disbursement_id;

  if not found then
    raise exception 'disbursement not found: %', p_disbursement_id;
  end if;

  if current_status = p_status then
    return p_disbursement_id;
  end if;

  if not (
    (current_status = 'pending_approval' and p_status in ('approved', 'rejected'))
    or (current_status = 'approved' and p_status in ('processing', 'rejected'))
    or (current_status = 'processing' and p_status in ('paid', 'failed', 'reversed'))
    or (current_status = 'failed' and p_status in ('processing', 'rejected'))
  ) then
    raise exception 'invalid admin disbursement transition: % -> %', current_status, p_status;
  end if;

  update public.admin_disbursements ad
  set
    status = p_status,
    approved_by = case when p_status in ('approved', 'processing', 'paid') then coalesce(p_actor_id, ad.approved_by) else ad.approved_by end,
    approved_at = case when p_status in ('approved', 'processing', 'paid') and ad.approved_at is null then now() else ad.approved_at end,
    rejected_reason = case when p_status = 'rejected' then coalesce(p_rejected_reason, ad.rejected_reason) else ad.rejected_reason end,
    payout_reference = coalesce(p_payout_reference, ad.payout_reference),
    paid_out_at = case when p_status = 'paid' then now() else ad.paid_out_at end,
    failed_at = case when p_status = 'failed' then now() else ad.failed_at end
  where ad.id = p_disbursement_id;

  return p_disbursement_id;
end;
$$;

-- 4) Webhook finalizer for Paytota transaction callbacks.
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

  -- Linked service payout/disbursement state updates.
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

  return tx_row.id;
end;
$$;

comment on function public.current_app_user_id() is 'Returns app user id from JWT app_user_id claim, falling back to auth.uid().';
comment on function public.is_admin_user() is 'Returns true when JWT role/app_role claim indicates admin.';
comment on function public.admin_set_disbursement_status(text, text, text, text, text) is 'Admin transition helper for disbursement queue lifecycle.';
comment on function public.on_paytota_webhook_finalize_checkout(text, text, jsonb, text) is 'Applies Paytota webhook updates to transaction, checkout, service payment, and disbursement records.';
