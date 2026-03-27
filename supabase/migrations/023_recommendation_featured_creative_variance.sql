-- Make recommendations more "creative" and prioritize featured items.
-- This keeps the recommendation feed DB-driven but adds a small random exploration term.

create or replace function public.refresh_customer_home_feed(
  p_customer_id text,
  p_limit integer default 120
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if p_customer_id is null or length(trim(p_customer_id)) = 0 then
    raise exception 'customer_id is required';
  end if;

  if p_limit is null or p_limit < 1 then
    p_limit := 120;
  end if;

  delete from public.customer_home_feed where customer_id = p_customer_id;

  with
  candidate_products as (
    select
      p.id,
      p.category,
      p.brand,
      p.featured,
      p.created_at
    from public.products p
    where p.published = true
  ),
  category_signal as (
    select
      v.category,
      sum(v.weight) as category_weight
    from (
      select
        lower(trim(coalesce(w.category_snapshot, p.category))) as category,
        1.7::numeric as weight
      from public.buyer_wishlist_items w
      left join public.products p on p.id = w.product_id
      where w.customer_id = p_customer_id

      union all

      select
        lower(trim(bsr.category)) as category,
        case
          when bsr.status = 'completed' then 2.3::numeric
          when bsr.status = 'in_progress' then 1.6::numeric
          else 1.1::numeric
        end as weight
      from public.buyer_service_requests bsr
      where bsr.customer_id = p_customer_id
    ) v
    where v.category is not null and v.category <> ''
    group by v.category
  ),
  brand_signal as (
    select
      lower(trim(p.brand)) as brand,
      count(*)::numeric * 1.2::numeric as brand_weight
    from public.buyer_wishlist_items w
    join public.products p on p.id = w.product_id
    where w.customer_id = p_customer_id
      and p.brand <> ''
    group by lower(trim(p.brand))
  ),
  popularity_signal as (
    select
      w.product_id,
      count(*)::numeric as popularity_weight
    from public.buyer_wishlist_items w
    where w.product_id is not null
      and w.created_at >= now() - interval '180 days'
    group by w.product_id
  ),
  event_signal as (
    select
      e.product_id,
      sum(
        case e.event_type
          when 'purchase' then 4.0::numeric
          when 'wishlist_add' then 2.2::numeric
          when 'click' then 1.4::numeric
          when 'view' then 0.8::numeric
          when 'impression' then 0.3::numeric
          when 'search' then 1.0::numeric
          when 'wishlist_remove' then -1.5::numeric
          else 0::numeric
        end * e.event_value
      ) as event_weight
    from public.feed_product_events e
    where e.customer_id = p_customer_id
      and e.product_id is not null
      and e.created_at >= now() - interval '120 days'
    group by e.product_id
  ),
  scored as (
    select
      cp.id as product_id,
      case when cp.featured then 1 else 0 end as is_featured,
      (
        coalesce(cs.category_weight, 0) * 2.0
        + coalesce(bs.brand_weight, 0) * 1.5
        + coalesce(ps.popularity_weight, 0) * 0.6
        + coalesce(es.event_weight, 0) * 2.4
        + case when cp.featured then 4.0 else 0 end
        + greatest(0, 5 - least(30, extract(day from (now() - cp.created_at)))) * 0.18
        -- Small exploration component so refreshes can slightly reshuffle.
        + ((random() - 0.5) * (case when cp.featured then 0.12 else 0.35 end))::numeric
      )::numeric(12, 6) as total_score,
      jsonb_build_object(
        'category', coalesce(cs.category_weight, 0),
        'brand', coalesce(bs.brand_weight, 0),
        'popularity', coalesce(ps.popularity_weight, 0),
        'events', coalesce(es.event_weight, 0),
        'featured', case when cp.featured then 4.0 else 0 end,
        'freshness',
          greatest(0, 5 - least(30, extract(day from (now() - cp.created_at)))) * 0.18
      ) as breakdown
    from candidate_products cp
    left join category_signal cs on cs.category = lower(trim(cp.category))
    left join brand_signal bs on bs.brand = lower(trim(cp.brand))
    left join popularity_signal ps on ps.product_id = cp.id
    left join event_signal es on es.product_id = cp.id
  ),
  ranked as (
    select
      s.product_id,
      row_number() over (
        order by s.is_featured desc, s.total_score desc, s.product_id asc
      ) as rank_position,
      s.total_score,
      s.breakdown
    from scored s
    order by s.is_featured desc, s.total_score desc, s.product_id asc
    limit p_limit
  )
  insert into public.customer_home_feed (
    customer_id, product_id, rank_position, score, score_breakdown, generated_at
  )
  select
    p_customer_id, r.product_id, r.rank_position, r.total_score, r.breakdown, now()
  from ranked r;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

