-- Sequential provider dispatch: relevance + one pending offer per request.

alter table public.vendors
  add column if not exists service_offerings text[] not null default '{}';

comment on column public.vendors.service_offerings is 'Lowercase keywords/phrases this provider serves; empty array = generalist (eligible for all).';

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'buyer_service_requests_status_valid' and conrelid = 'public.buyer_service_requests'::regclass
  ) then
    alter table public.buyer_service_requests drop constraint buyer_service_requests_status_valid;
  end if;
end $$;

alter table public.buyer_service_requests
  add constraint buyer_service_requests_status_valid check (
    status in ('pending', 'matched', 'in_progress', 'completed', 'cancelled')
  );

drop index if exists public.service_request_assignments_one_pending_per_request;
create unique index service_request_assignments_one_pending_per_request
  on public.service_request_assignments (request_id)
  where response = 'pending';
