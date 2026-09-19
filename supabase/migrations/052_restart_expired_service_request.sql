-- Allow a buyer to restart an expired or cancelled search on the same request.

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
    when old_status in ('expired', 'cancelled') and new_status = 'pending' then true
    else false
  end
$$;
