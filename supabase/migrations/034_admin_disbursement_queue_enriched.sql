-- Enrich admin_disbursement_queue for the admin payments / disbursement workspace.
--
-- New columns MUST be appended after the existing view column list. PostgreSQL
-- CREATE OR REPLACE VIEW maps columns by position; inserting a column in the
-- middle would be interpreted as renaming (e.g. source_type -> vendor_email).

create or replace view public.admin_disbursement_queue as
select
  ad.id,
  ad.vendor_id,
  v.name as vendor_name,
  ad.source_type,
  ad.source_reference,
  ad.status,
  ad.currency,
  ad.gross_amount,
  ad.fee_amount,
  ad.net_amount,
  ad.payout_reference,
  ad.scheduled_for,
  ad.approved_at,
  ad.paid_out_at,
  ad.failed_at,
  ad.created_at,
  v.email as vendor_email,
  ad.rejected_reason,
  ad.updated_at,
  ad.payout_account_id,
  vpa.account_type as payout_account_type,
  vpa.network as payout_network,
  vpa.account_name as payout_account_name,
  vpa.account_number as payout_account_number
from public.admin_disbursements ad
left join public.vendors v on v.id = ad.vendor_id
left join public.vendor_payout_accounts vpa on vpa.id = ad.payout_account_id;

comment on view public.admin_disbursement_queue is 'Dashboard view for operational payout management (includes payout account and vendor contact hints).';
