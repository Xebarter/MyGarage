-- Personalized home-feed recommendation engine for MyGarage.
-- Creates per-customer feed snapshots, scoring functions, and refresh routines.

create table if not exists public.feed_product_events (
  id bigserial primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  product_id text references public.products(id) on delete cascade,
  event_type text not null,
  event_value numeric(8, 3) not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists feed_product_events_customer_id_idx
  on public.feed_product_events (customer_id, created_at desc);
create index if not exists feed_product_events_product_id_idx
  on public.feed_product_events (product_id, created_at desc);
create index if not exists feed_product_events_event_type_idx
  on public.feed_product_events (event_type);
create index if not exists feed_product_events_metadata_gin_idx
  on public.feed_product_events using gin (metadata);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'feed_product_events_event_type_valid' and conrelid = 'public.feed_product_events'::regclass
  ) then
    alter table public.feed_product_events add constraint feed_product_events_event_type_valid check (
      event_type in ('impression', 'click', 'wishlist_add', 'wishlist_remove', 'purchase', 'search', 'view')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'feed_product_events_event_value_positive' and conrelid = 'public.feed_product_events'::regclass
  ) then
    alter table public.feed_product_events add constraint feed_product_events_event_value_positive check (event_value > 0);
  end if;
end $$;

create table if not exists public.customer_home_feed (
  customer_id text not null references public.customers(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  rank_position integer not null,
  score numeric(12, 6) not null default 0,
  score_breakdown jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

create unique index if not exists customer_home_feed_customer_rank_key
  on public.customer_home_feed (customer_id, rank_position);
create index if not exists customer_home_feed_customer_generated_idx
  on public.customer_home_feed (customer_id, generated_at desc);
create index if not exists customer_home_feed_score_idx
  on public.customer_home_feed (score desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'customer_home_feed_rank_positive' and conrelid = 'public.customer_home_feed'::regclass
  ) then
    alter table public.customer_home_feed add constraint customer_home_feed_rank_positive check (rank_position > 0);
  end if;
end $$;

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
      p.created_at,
      greatest(0, p.stock - coalesce(p.reserved_stock, 0)) as available_stock
    from public.products p
    where p.published = true
      and greatest(0, p.stock - coalesce(p.reserved_stock, 0)) > 0
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
      (
        coalesce(cs.category_weight, 0) * 2.0
        + coalesce(bs.brand_weight, 0) * 1.5
        + coalesce(ps.popularity_weight, 0) * 0.6
        + coalesce(es.event_weight, 0) * 2.4
        + case when cp.featured then 1.7 else 0 end
        + greatest(0, 5 - least(30, extract(day from (now() - cp.created_at)))) * 0.18
        + ln(1 + cp.available_stock)::numeric * 0.25
      )::numeric(12, 6) as total_score,
      jsonb_build_object(
        'category', coalesce(cs.category_weight, 0),
        'brand', coalesce(bs.brand_weight, 0),
        'popularity', coalesce(ps.popularity_weight, 0),
        'events', coalesce(es.event_weight, 0),
        'featured', case when cp.featured then 1.7 else 0 end,
        'freshness',
          greatest(0, 5 - least(30, extract(day from (now() - cp.created_at)))) * 0.18,
        'stock', ln(1 + cp.available_stock)::numeric * 0.25
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
      row_number() over (order by s.total_score desc, s.product_id asc) as rank_position,
      s.total_score,
      s.breakdown
    from scored s
    order by s.total_score desc, s.product_id asc
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

create or replace function public.refresh_all_customer_home_feeds(
  p_limit integer default 120
)
returns table (customer_id text, inserted_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
begin
  for c in
    select id from public.customers
  loop
    customer_id := c.id;
    inserted_count := public.refresh_customer_home_feed(c.id, p_limit);
    return next;
  end loop;
end;
$$;

create or replace function public.get_customer_home_feed(
  p_customer_id text,
  p_limit integer default 40,
  p_force_refresh boolean default false
)
returns table (
  id text,
  name text,
  description text,
  price numeric,
  compare_at_price numeric,
  image text,
  images jsonb,
  featured boolean,
  featured_request_pending boolean,
  published boolean,
  category text,
  subcategory text,
  brand text,
  stock integer,
  reserved_stock integer,
  low_stock_threshold integer,
  sku text,
  slug text,
  tags text[],
  weight_kg numeric,
  vendor_id text,
  created_at timestamptz,
  updated_at timestamptz,
  feed_rank integer,
  feed_score numeric,
  score_breakdown jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  should_refresh boolean := false;
begin
  if p_limit is null or p_limit < 1 then
    p_limit := 40;
  end if;

  if p_customer_id is null or length(trim(p_customer_id)) = 0 then
    return query
    select
      p.id,
      p.name,
      p.description,
      p.price,
      p.compare_at_price,
      p.image,
      p.images,
      p.featured,
      p.featured_request_pending,
      p.published,
      p.category,
      p.subcategory,
      p.brand,
      p.stock,
      p.reserved_stock,
      p.low_stock_threshold,
      p.sku,
      p.slug,
      p.tags,
      p.weight_kg,
      p.vendor_id,
      p.created_at,
      p.updated_at,
      row_number() over (order by p.featured desc, p.created_at desc) as feed_rank,
      (
        case when p.featured then 3 else 0 end
        + ln(1 + greatest(0, p.stock - coalesce(p.reserved_stock, 0)))::numeric * 0.25
      )::numeric as feed_score,
      jsonb_build_object('fallback', true) as score_breakdown
    from public.products p
    where p.published = true
      and greatest(0, p.stock - coalesce(p.reserved_stock, 0)) > 0
    order by p.featured desc, p.created_at desc
    limit p_limit;
    return;
  end if;

  select
    p_force_refresh
    or not exists (
      select 1 from public.customer_home_feed f where f.customer_id = p_customer_id
    )
    or exists (
      select 1
      from public.customer_home_feed f
      where f.customer_id = p_customer_id
      group by f.customer_id
      having max(f.generated_at) < now() - interval '2 hours'
    )
  into should_refresh;

  if should_refresh then
    perform public.refresh_customer_home_feed(p_customer_id, greatest(120, p_limit));
  end if;

  return query
  select
    p.id,
    p.name,
    p.description,
    p.price,
    p.compare_at_price,
    p.image,
    p.images,
    p.featured,
    p.featured_request_pending,
    p.published,
    p.category,
    p.subcategory,
    p.brand,
    p.stock,
    p.reserved_stock,
    p.low_stock_threshold,
    p.sku,
    p.slug,
    p.tags,
    p.weight_kg,
    p.vendor_id,
    p.created_at,
    p.updated_at,
    f.rank_position as feed_rank,
    f.score as feed_score,
    f.score_breakdown
  from public.customer_home_feed f
  join public.products p on p.id = f.product_id
  where f.customer_id = p_customer_id
    and p.published = true
  order by f.rank_position asc
  limit p_limit;
end;
$$;

alter table public.feed_product_events enable row level security;
alter table public.customer_home_feed enable row level security;

drop policy if exists "feed_product_events_select_public" on public.feed_product_events;
create policy "feed_product_events_select_public"
  on public.feed_product_events
  for select
  to anon, authenticated
  using (true);

drop policy if exists "customer_home_feed_select_public" on public.customer_home_feed;
create policy "customer_home_feed_select_public"
  on public.customer_home_feed
  for select
  to anon, authenticated
  using (true);

comment on table public.feed_product_events is 'Interaction events used to personalize customer home feed ranking.';
comment on table public.customer_home_feed is 'Materialized customer-specific home feed ranking snapshots.';
comment on function public.refresh_customer_home_feed(text, integer) is 'Rebuilds one customer feed snapshot with multi-signal scoring.';
comment on function public.refresh_all_customer_home_feeds(integer) is 'Rebuilds feeds for all customers.';
comment on function public.get_customer_home_feed(text, integer, boolean) is 'Returns personalized (or fallback) ranked products for home feed.';
