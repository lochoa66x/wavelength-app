-- Read-only P4.4 production verification. Expected: one row with every
-- boolean true and every count at its documented value.
select
  c.relrowsecurity as rls_enabled,
  (
    select count(*) = 0
    from information_schema.role_column_grants
    where table_schema = 'public'
      and table_name = 'listings'
      and grantee in ('anon', 'authenticated')
      and privilege_type <> 'SELECT'
  ) as browser_has_no_listing_writes,
  (
    select count(*) = 0
    from information_schema.role_column_grants
    where table_schema = 'public'
      and table_name = 'listings'
      and grantee in ('anon', 'authenticated')
      and column_name in (
        'consecutive_misses', 'source_run_id', 'source_scope', 'last_miss_run_id'
      )
  ) as internal_columns_not_granted,
  (
    select count(*) = 7
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_listings'
      and column_name in (
        'availability_status', 'first_seen_at', 'last_seen_at',
        'last_checked_at', 'closed_at', 'availability_reason', 'valid_through'
      )
  ) as public_view_has_safe_lifecycle_fields,
  (
    select count(*) = 0
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_listings'
      and column_name in (
        'consecutive_misses', 'source_run_id', 'source_scope', 'last_miss_run_id'
      )
  ) as public_view_excludes_internal_lifecycle_fields,
  not has_function_privilege(
    'anon',
    'public.finalize_listing_source_run(text,text,uuid,timestamptz,smallint)',
    'EXECUTE'
  ) as anon_cannot_finalize,
  not has_function_privilege(
    'authenticated',
    'public.finalize_listing_source_run(text,text,uuid,timestamptz,smallint)',
    'EXECUTE'
  ) as authenticated_cannot_finalize,
  has_function_privilege(
    'service_role',
    'public.finalize_listing_source_run(text,text,uuid,timestamptz,smallint)',
    'EXECUTE'
  ) as service_role_can_finalize,
  (
    select count(*) = 3
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'listings'
      and indexname in (
        'listings_discovery_availability_posted_idx',
        'listings_source_run_scope_idx',
        'listings_availability_check_due_idx'
      )
  ) as lifecycle_indexes_present,
  (
    select count(*) >= 3
    from pg_constraint
    where conrelid = 'public.listings'::regclass
      and conname in (
        'listings_availability_status_check',
        'listings_consecutive_misses_check',
        'listings_availability_reason_check'
      )
  ) as lifecycle_constraints_present
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'listings';

-- Aggregate-only state distribution; never select listing content or URLs.
select
  availability_status,
  count(*) as listing_count,
  count(*) filter (where last_checked_at is null) as unchecked_count,
  count(*) filter (where availability_status = 'closed' and closed_at is null) as closed_without_timestamp
from public.listings
group by availability_status
order by availability_status;
