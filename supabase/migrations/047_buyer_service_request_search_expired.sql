-- Allow request-level search expiry (no provider found within the search window).
-- Also permit pending -> cancelled (buyer stop search), which the app already uses.

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'buyer_service_requests_status_valid'
      and conrelid = 'public.buyer_service_requests'::regclass
  ) then
    alter table public.buyer_service_requests drop constraint buyer_service_requests_status_valid;
  end if;
end $$;

alter table public.buyer_service_requests
  add constraint buyer_service_requests_status_valid check (
    status in ('pending', 'matched', 'in_progress', 'completed', 'cancelled', 'expired')
  );

create or replace function public.is_valid_service_status_transition(old_status text, new_status text)
returns boolean
language sql
immutable
as $$
  select case
    when old_status = new_status then true
    when old_status = 'pending' and new_status in ('matched', 'in_progress', 'completed', 'cancelled', 'expired') then true
    when old_status = 'matched' and new_status in ('in_progress', 'completed', 'cancelled') then true
    when old_status = 'in_progress' and new_status in ('completed', 'cancelled') then true
    else false
  end
$$;
