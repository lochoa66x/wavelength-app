alter table public.listings
  add column if not exists description_snippet text,
  add column if not exists description_source text,
  add column if not exists description_status text,
  add column if not exists description_source_url text,
  add column if not exists description_fetched_at timestamptz,
  add column if not exists description_content_hash text,
  add column if not exists description_enrichment_error_code text;

update public.listings
set
  description_snippet = coalesce(description_snippet, description),
  description_source = coalesce(
    description_source,
    case
      when coalesce(array_length(regexp_split_to_array(trim(coalesce(description, '')), E'\\s+'), 1), 0) >= 140
        then 'provider_full'
      else 'provider_snippet'
    end
  ),
  description_status = coalesce(
    description_status,
    case
      when coalesce(array_length(regexp_split_to_array(trim(coalesce(description, '')), E'\\s+'), 1), 0) < 35 then 'insufficient'
      when coalesce(array_length(regexp_split_to_array(trim(coalesce(description, '')), E'\\s+'), 1), 0) < 140 then 'partial'
      else 'complete'
    end
  ),
  description_source_url = coalesce(description_source_url, url),
  description_fetched_at = coalesce(description_fetched_at, fetched_at)
where description_source is null
   or description_status is null
   or description_snippet is null
   or description_source_url is null
   or description_fetched_at is null;

alter table public.listings drop constraint if exists listings_description_source_check;
alter table public.listings add constraint listings_description_source_check
  check (description_source is null or description_source in (
    'provider_snippet', 'provider_full', 'employer_jsonld', 'employer_html',
    'user_link', 'user_paste', 'user_screenshot'
  ));

alter table public.listings drop constraint if exists listings_description_status_check;
alter table public.listings add constraint listings_description_status_check
  check (description_status is null or description_status in ('insufficient', 'partial', 'complete'));

alter table public.listings drop constraint if exists listings_description_enrichment_error_check;
alter table public.listings add constraint listings_description_enrichment_error_check
  check (description_enrichment_error_code is null or description_enrichment_error_code in (
    'blocked', 'timeout', 'unreadable', 'http_error', 'invalid_content',
    'source_mismatch', 'incomplete', 'unknown'
  ));

create index if not exists listings_description_enrichment_idx
  on public.listings (description_status, description_fetched_at);

comment on column public.listings.description_snippet is 'Original provider text preserved even after on-demand enrichment.';
comment on column public.listings.description_source is 'Provenance for the active description used by tailoring.';
comment on column public.listings.description_status is 'Deterministic completeness assessment: insufficient, partial, or complete.';
