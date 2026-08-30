begin;

-- Listing lifecycle is deliberately independent from posting age. Importers
-- record what they actually observed; a missed/blocked check never becomes a
-- false "closed" result after a single incomplete upstream run.
alter table public.listings
  add column if not exists availability_status text,
  add column if not exists first_seen_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists last_checked_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists consecutive_misses integer,
  add column if not exists availability_reason text,
  add column if not exists source_run_id uuid,
  add column if not exists source_scope text,
  add column if not exists last_miss_run_id uuid,
  add column if not exists valid_through timestamptz;

-- Some of these columns were introduced manually before this migration was
-- formalized. Normalize only invalid legacy values so the constraints below
-- can be installed without discarding a valid status or declaring anything
-- closed.
update public.listings
set availability_status = 'uncertain'
where availability_status is not null
  and availability_status not in ('active', 'uncertain', 'closed');

update public.listings
set consecutive_misses = 0
where consecutive_misses is not null
  and consecutive_misses < 0;

update public.listings
set availability_reason = 'unknown'
where availability_reason is not null
  and availability_reason not in (
    'seen_in_source', 'missed_once', 'missed_repeatedly', 'http_closed',
    'expired_structured_data', 'provider_closed', 'publisher_blocked',
    'rate_limited', 'timeout', 'network_error', 'upstream_error',
    'unreadable', 'source_mismatch', 'generic_careers_page',
    'manual_refresh', 'legacy_backfill', 'unknown'
  );

update public.listings
set
  availability_status = coalesce(availability_status, 'active'),
  first_seen_at = coalesce(first_seen_at, fetched_at, posted_at, now()),
  last_seen_at = coalesce(last_seen_at, fetched_at, posted_at, now()),
  last_checked_at = coalesce(last_checked_at, fetched_at, posted_at, now()),
  consecutive_misses = greatest(coalesce(consecutive_misses, 0), 0),
  availability_reason = coalesce(availability_reason, 'legacy_backfill'),
  source_scope = coalesce(nullif(btrim(source_scope), ''), source)
where availability_status is null
   or first_seen_at is null
   or last_seen_at is null
   or last_checked_at is null
   or consecutive_misses is null
   or availability_reason is null
   or source_scope is null
   or btrim(source_scope) = '';

alter table public.listings
  alter column availability_status set default 'active',
  alter column availability_status set not null,
  alter column consecutive_misses set default 0,
  alter column consecutive_misses set not null;

alter table public.listings drop constraint if exists listings_availability_status_check;
alter table public.listings add constraint listings_availability_status_check
  check (availability_status in ('active', 'uncertain', 'closed'));

alter table public.listings drop constraint if exists listings_consecutive_misses_check;
alter table public.listings add constraint listings_consecutive_misses_check
  check (consecutive_misses >= 0);

alter table public.listings drop constraint if exists listings_availability_reason_check;
alter table public.listings add constraint listings_availability_reason_check
  check (availability_reason is null or availability_reason in (
    'seen_in_source', 'missed_once', 'missed_repeatedly', 'http_closed',
    'expired_structured_data', 'provider_closed', 'publisher_blocked',
    'rate_limited', 'timeout', 'network_error', 'upstream_error',
    'unreadable', 'source_mismatch', 'generic_careers_page',
    'manual_refresh', 'legacy_backfill', 'unknown'
  ));

create index if not exists listings_discovery_availability_posted_idx
  on public.listings (availability_status, posted_at desc, id desc);

create index if not exists listings_source_run_scope_idx
  on public.listings (source, source_scope, source_run_id)
  where availability_status <> 'closed';

create index if not exists listings_availability_check_due_idx
  on public.listings (last_checked_at, id)
  where availability_status in ('active', 'uncertain');

-- A successful, complete source scope calls this once. The run id makes the
-- miss transition idempotent across retries, while source_scope prevents one
-- failed ATS board from affecting another board using the same provider.
create or replace function public.finalize_listing_source_run(
  p_source text,
  p_scope text,
  p_run_id uuid,
  p_checked_at timestamptz default now(),
  p_close_after smallint default 3
)
returns table (uncertain_count bigint, closed_count bigint)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if nullif(btrim(p_source), '') is null
     or nullif(btrim(p_scope), '') is null
     or p_run_id is null
     or p_close_after < 2
     or p_close_after > 10 then
    raise exception 'invalid listing source finalization input';
  end if;

  return query
  with transitioned as (
    update public.listings
    set
      consecutive_misses = least(consecutive_misses + 1, p_close_after),
      availability_status = case
        when consecutive_misses + 1 >= p_close_after then 'closed'
        else 'uncertain'
      end,
      availability_reason = case
        when consecutive_misses + 1 >= p_close_after then 'missed_repeatedly'
        else 'missed_once'
      end,
      last_checked_at = p_checked_at,
      closed_at = case
        when consecutive_misses + 1 >= p_close_after then coalesce(closed_at, p_checked_at)
        else null
      end,
      last_miss_run_id = p_run_id
    where source = p_source
      and coalesce(nullif(btrim(source_scope), ''), source) = p_scope
      and source_run_id is distinct from p_run_id
      and last_miss_run_id is distinct from p_run_id
      and availability_status <> 'closed'
    returning availability_status
  )
  select
    count(*) filter (where availability_status = 'uncertain'),
    count(*) filter (where availability_status = 'closed')
  from transitioned;
end;
$$;

revoke all on function public.finalize_listing_source_run(text, text, uuid, timestamptz, smallint)
  from public, anon, authenticated;
grant execute on function public.finalize_listing_source_run(text, text, uuid, timestamptz, smallint)
  to service_role;

-- Extend the existing column-level browser grant only with presentation-safe
-- lifecycle fields. Internal run ids, scopes, and counters stay server-only.
revoke all on table public.listings from anon, authenticated;
grant select (
  id, category, tier, title, company, location, job_type, source,
  city, region, country_code, location_type, reason, description_snippet,
  url, posted_at, availability_status, first_seen_at, last_seen_at,
  last_checked_at, closed_at, availability_reason, valid_through
) on table public.listings to anon, authenticated;

create or replace view public.public_listings
with (security_invoker = true, security_barrier = true)
as
select
  id,
  category,
  tier,
  title,
  company,
  location,
  job_type,
  source,
  city,
  region,
  country_code,
  location_type,
  reason,
  description_snippet,
  url,
  posted_at,
  availability_status,
  first_seen_at,
  last_seen_at,
  last_checked_at,
  closed_at,
  availability_reason,
  valid_through
from public.listings
where nullif(btrim(title), '') is not null
  and nullif(btrim(company), '') is not null
  and url ~* '^https://'
  and source <> 'craigslist';

revoke all on table public.public_listings from public, anon, authenticated;
grant select on table public.public_listings to anon, authenticated;

comment on column public.listings.availability_status is
  'Conservative lifecycle state: active, uncertain, or closed.';
comment on column public.listings.source_scope is
  'Importer-owned scope used to isolate complete-run miss accounting.';
comment on column public.listings.source_run_id is
  'Latest complete or partial source run that observed this listing.';
comment on view public.public_listings is
  'Read-only public discovery fields including safe availability state. Internal ingestion identifiers and counters are excluded.';

commit;
