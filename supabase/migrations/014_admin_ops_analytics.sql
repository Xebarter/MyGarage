-- Admin operational analytics views for checkout, revenue, payouts, and refunds.

-- 1) Checkout funnel summary (high-level conversion health).
create or replace view public.admin_checkout_funnel_summary as
select
  count(*)::bigint as total_checkouts,
  count(*) filter (where cs.status = 'draft')::bigint as draft_count,
  count(*) filter (where cs.status = 'review')::bigint as review_count,
  count(*) filter (where cs.status = 'payment_pending')::bigint as payment_pending_count,
  count(*) filter (where cs.status = 'paid')::bigint as paid_count,
  count(*) filter (where cs.status = 'fulfilled')::bigint as fulfilled_count,
  count(*) filter (where cs.status = 'failed')::bigint as failed_count,
  count(*) filter (where cs.status = 'cancelled')::bigint as cancelled_count,
  count(*) filter (where cs.status = 'expired')::bigint as expired_count,
  (
    (count(*) filter (where cs.status in ('paid', 'fulfilled'))::numeric)
    / nullif(count(*)::numeric, 0)
  )::numeric(8, 4) as checkout_to_paid_rate
from public.checkout_sessions cs;

-- 2) Daily checkout metrics by type.
create or replace view public.admin_daily_checkout_metrics as
select
  date_trunc('day', cs.created_at)::date as day,
  cs.checkout_type,
  count(*)::bigint as total_checkouts,
  count(*) filter (where cs.status in ('paid', 'fulfilled'))::bigint as successful_checkouts,
  count(*) filter (where cs.status in ('failed', 'cancelled', 'expired'))::bigint as unsuccessful_checkouts,
  coalesce(sum(cs.total_amount), 0)::numeric(14, 2) as total_checkout_amount,
  coalesce(sum(case when cs.status in ('paid', 'fulfilled') then cs.total_amount else 0 end), 0)::numeric(14, 2) as successful_amount,
  (
    (count(*) filter (where cs.status in ('paid', 'fulfilled'))::numeric)
    / nullif(count(*)::numeric, 0)
  )::numeric(8, 4) as success_rate
from public.checkout_sessions cs
group by date_trunc('day', cs.created_at)::date, cs.checkout_type;

-- 3) Revenue rollup (products/services, gross and net-like totals).
create or replace view public.admin_revenue_summary as
with product_rev as (
  select
    coalesce(sum(po.total_amount), 0)::numeric(14, 2) as product_gross,
    coalesce(sum(po.platform_fee_amount), 0)::numeric(14, 2) as product_platform_fees
  from public.product_orders po
  where po.status in ('pending_fulfillment', 'processing', 'shipped', 'delivered')
),
service_rev as (
  select
    coalesce(sum(sp.amount), 0)::numeric(14, 2) as service_gross
  from public.service_payments sp
  where sp.status in ('authorized', 'captured')
),
refunds as (
  select
    coalesce(sum(rr.approved_amount), 0)::numeric(14, 2) as total_refunds
  from public.refund_requests rr
  where rr.status = 'succeeded'
)
select
  p.product_gross,
  s.service_gross,
  (p.product_gross + s.service_gross)::numeric(14, 2) as gross_revenue,
  p.product_platform_fees,
  r.total_refunds,
  (p.product_gross + s.service_gross - r.total_refunds)::numeric(14, 2) as net_after_refunds
from product_rev p
cross join service_rev s
cross join refunds r;

-- 4) Paytota transaction health.
create or replace view public.admin_paytota_transaction_health as
select
  pt.transaction_type,
  pt.direction,
  count(*)::bigint as total_transactions,
  count(*) filter (where pt.status = 'succeeded')::bigint as succeeded_count,
  count(*) filter (where pt.status = 'processing')::bigint as processing_count,
  count(*) filter (where pt.status = 'pending')::bigint as pending_count,
  count(*) filter (where pt.status = 'failed')::bigint as failed_count,
  count(*) filter (where pt.status = 'cancelled')::bigint as cancelled_count,
  coalesce(sum(pt.amount), 0)::numeric(14, 2) as total_amount,
  coalesce(sum(case when pt.status = 'succeeded' then pt.amount else 0 end), 0)::numeric(14, 2) as succeeded_amount,
  (
    (count(*) filter (where pt.status = 'succeeded')::numeric)
    / nullif(count(*)::numeric, 0)
  )::numeric(8, 4) as success_rate
from public.paytota_transactions pt
group by pt.transaction_type, pt.direction;

-- 5) Admin disbursement pipeline.
create or replace view public.admin_disbursement_pipeline_metrics as
select
  count(*)::bigint as total_disbursements,
  count(*) filter (where ad.status = 'pending_approval')::bigint as pending_approval_count,
  count(*) filter (where ad.status = 'approved')::bigint as approved_count,
  count(*) filter (where ad.status = 'processing')::bigint as processing_count,
  count(*) filter (where ad.status = 'paid')::bigint as paid_count,
  count(*) filter (where ad.status = 'failed')::bigint as failed_count,
  count(*) filter (where ad.status = 'rejected')::bigint as rejected_count,
  count(*) filter (where ad.status = 'reversed')::bigint as reversed_count,
  coalesce(sum(ad.net_amount), 0)::numeric(14, 2) as total_net_amount,
  coalesce(sum(case when ad.status = 'paid' then ad.net_amount else 0 end), 0)::numeric(14, 2) as paid_net_amount,
  coalesce(sum(case when ad.status in ('pending_approval', 'approved', 'processing') then ad.net_amount else 0 end), 0)::numeric(14, 2) as pending_net_amount
from public.admin_disbursements ad;

-- 6) Refund metrics and rate.
create or replace view public.admin_refund_metrics as
with base as (
  select
    count(*)::bigint as total_refund_requests,
    count(*) filter (where rr.status = 'succeeded')::bigint as succeeded_refunds,
    count(*) filter (where rr.status = 'failed')::bigint as failed_refunds,
    count(*) filter (where rr.status = 'processing')::bigint as processing_refunds,
    count(*) filter (where rr.status = 'requested')::bigint as requested_refunds,
    count(*) filter (where rr.status = 'rejected')::bigint as rejected_refunds,
    coalesce(sum(rr.requested_amount), 0)::numeric(14, 2) as requested_refund_amount,
    coalesce(sum(case when rr.status = 'succeeded' then rr.approved_amount else 0 end), 0)::numeric(14, 2) as succeeded_refund_amount
  from public.refund_requests rr
),
rev as (
  select gross_revenue
  from public.admin_revenue_summary
)
select
  b.total_refund_requests,
  b.succeeded_refunds,
  b.failed_refunds,
  b.processing_refunds,
  b.requested_refunds,
  b.rejected_refunds,
  b.requested_refund_amount,
  b.succeeded_refund_amount,
  r.gross_revenue,
  (
    b.succeeded_refund_amount / nullif(r.gross_revenue, 0)
  )::numeric(8, 4) as refund_rate_on_gross_revenue
from base b
cross join rev r;

-- 7) Vendor-level payout and settlement performance.
create or replace view public.admin_vendor_financial_health as
with product_settlements as (
  select
    pvs.vendor_id,
    coalesce(sum(pvs.gross_amount), 0)::numeric(14, 2) as product_settlement_gross,
    coalesce(sum(case when pvs.status = 'paid' then pvs.net_amount else 0 end), 0)::numeric(14, 2) as product_settlement_paid,
    coalesce(sum(case when pvs.status in ('pending', 'processing') then pvs.net_amount else 0 end), 0)::numeric(14, 2) as product_settlement_pending
  from public.product_vendor_settlements pvs
  group by pvs.vendor_id
),
service_payouts as (
  select
    spp.provider_id as vendor_id,
    coalesce(sum(spp.gross_amount), 0)::numeric(14, 2) as service_payout_gross,
    coalesce(sum(case when spp.status = 'paid' then spp.net_amount else 0 end), 0)::numeric(14, 2) as service_payout_paid,
    coalesce(sum(case when spp.status in ('pending', 'processing') then spp.net_amount else 0 end), 0)::numeric(14, 2) as service_payout_pending
  from public.service_provider_payouts spp
  group by spp.provider_id
),
ad as (
  select
    ad.vendor_id,
    count(*)::bigint as disbursement_count,
    count(*) filter (where ad.status = 'failed')::bigint as disbursement_failed_count,
    coalesce(sum(case when ad.status = 'paid' then ad.net_amount else 0 end), 0)::numeric(14, 2) as disbursed_net_amount
  from public.admin_disbursements ad
  group by ad.vendor_id
)
select
  v.id as vendor_id,
  v.name as vendor_name,
  coalesce(ps.product_settlement_gross, 0)::numeric(14, 2) as product_settlement_gross,
  coalesce(ps.product_settlement_paid, 0)::numeric(14, 2) as product_settlement_paid,
  coalesce(ps.product_settlement_pending, 0)::numeric(14, 2) as product_settlement_pending,
  coalesce(sp.service_payout_gross, 0)::numeric(14, 2) as service_payout_gross,
  coalesce(sp.service_payout_paid, 0)::numeric(14, 2) as service_payout_paid,
  coalesce(sp.service_payout_pending, 0)::numeric(14, 2) as service_payout_pending,
  coalesce(ad.disbursement_count, 0)::bigint as disbursement_count,
  coalesce(ad.disbursement_failed_count, 0)::bigint as disbursement_failed_count,
  coalesce(ad.disbursed_net_amount, 0)::numeric(14, 2) as disbursed_net_amount
from public.vendors v
left join product_settlements ps on ps.vendor_id = v.id
left join service_payouts sp on sp.vendor_id = v.id
left join ad on ad.vendor_id = v.id;

-- 8) Simple admin KPI snapshot for dashboard top cards.
create or replace view public.admin_kpi_snapshot as
select
  now() as generated_at,
  coalesce((select gross_revenue from public.admin_revenue_summary), 0)::numeric(14, 2) as gross_revenue,
  coalesce((select net_after_refunds from public.admin_revenue_summary), 0)::numeric(14, 2) as net_after_refunds,
  coalesce((select total_net_amount from public.admin_disbursement_pipeline_metrics), 0)::numeric(14, 2) as total_disbursement_obligation,
  coalesce((select paid_net_amount from public.admin_disbursement_pipeline_metrics), 0)::numeric(14, 2) as paid_disbursements,
  coalesce((select pending_net_amount from public.admin_disbursement_pipeline_metrics), 0)::numeric(14, 2) as pending_disbursements,
  coalesce((select refund_rate_on_gross_revenue from public.admin_refund_metrics), 0)::numeric(8, 4) as refund_rate,
  coalesce((select checkout_to_paid_rate from public.admin_checkout_funnel_summary), 0)::numeric(8, 4) as checkout_to_paid_rate;

comment on view public.admin_checkout_funnel_summary is 'Checkout stage counts and paid conversion rate.';
comment on view public.admin_daily_checkout_metrics is 'Daily checkout performance by checkout type.';
comment on view public.admin_revenue_summary is 'Platform gross revenue, fees, refunds, and net-after-refunds.';
comment on view public.admin_paytota_transaction_health is 'Paytota transaction success/failure metrics by type and direction.';
comment on view public.admin_disbursement_pipeline_metrics is 'Disbursement queue and payout pipeline totals.';
comment on view public.admin_refund_metrics is 'Refund counts, amounts, and refund rate against gross revenue.';
comment on view public.admin_vendor_financial_health is 'Vendor-level settlement, payout, and disbursement health.';
comment on view public.admin_kpi_snapshot is 'Single-row KPI snapshot for admin dashboard top cards.';
